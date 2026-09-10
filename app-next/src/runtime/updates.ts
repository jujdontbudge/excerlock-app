/**
 * T03 OTA coordinator — single owner of every `expo-updates` call.
 *
 * Mount contract (root-owned): mount `useOtaCoordinator` at the runtime root,
 * above every guard. The coordinator never gates on paywall or setup state;
 * it only receives primitive safe-boundary inputs via DI. Fail closed when any
 * safety input is unknown.
 *
 * First launch: native `ON_LOAD` owns check+download inside
 * `fallbackToCacheTimeout`. JS only observes `useUpdates()` via
 * `observeStartup()` and never issues a duplicate check on the same launch.
 *
 * Later: on foreground after >= 6h in background, `checkForUpdateAsync` then
 * `fetchUpdateAsync` with SEPARATE budgets, then `reloadAsync` only at a safe
 * boundary. Reload-loop guard persists `{ updateId, launchCount }` and stops
 * after two failed activations of one update id. `markSuccessfulLaunch` is the
 * only path that clears the guard (called when the new runtime reaches the
 * coordinator steady milestone).
 *
 * No unsafe reload races: every budgeted operation captures an epoch. Timeout
 * revokes the epoch; late work that resolves after revocation throws instead
 * of reloading. No concurrent checks/reloads: `inFlight` serializes work.
 *
 * Code-signing note: Expo account is Free, so the conditional signing
 * requirement is not enabled. No keys are created here and no tamper
 * verification is claimed.
 */
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Budgets / policy
// ---------------------------------------------------------------------------

/** Foreground is stale only after 6h in background. */
export const OTA_FOREGROUND_STALE_MS = 6 * 60 * 60 * 1000;
/** Budget for `checkForUpdateAsync` alone. */
export const OTA_CHECK_BUDGET_MS = 15_000;
/** Budget for `fetchUpdateAsync` alone (separate from check). */
export const OTA_FETCH_BUDGET_MS = 60_000;
/** Stop retrying one update id after this many reloads without success. */
export const OTA_MAX_RELOAD_ATTEMPTS = 2;

const OTA_GUARD_KEY = 'excerlock-next.ota-guard.v1';
const OTA_ENVELOPE_KEY = 'excerlock-next.ota-envelope.v1';
const OTA_LAST_CHECK_KEY = 'excerlock-next.ota-last-check.v1';

// ---------------------------------------------------------------------------
// Types (primitives only — no guard/store imports)
// ---------------------------------------------------------------------------

/** Primitive safe-boundary inputs. `null`/`undefined` means unknown → unsafe. */
export type OtaSafetyInput = {
  purchaseOrRestoreBusy: boolean | null | undefined;
  permissionPromptPending: boolean | null | undefined;
  cameraActive: boolean | null | undefined;
  walkingActive: boolean | null | undefined;
  proppedActive: boolean | null | undefined;
  isForeground: boolean | null | undefined;
  route: string | null | undefined;
};

export type OtaResumeEnvelope = {
  route: string;
  draftIds: string[];
  savedAtMs: number;
};

export type OtaPersistedGuard = {
  updateId: string;
  launchCount: number;
};

export interface OtaStorage {
  loadGuard(): Promise<OtaPersistedGuard | null>;
  saveGuard(guard: OtaPersistedGuard): Promise<void>;
  clearGuard(): Promise<void>;
  loadEnvelope(): Promise<OtaResumeEnvelope | null>;
  saveEnvelope(envelope: OtaResumeEnvelope): Promise<void>;
  loadLastCheckAtMs(): Promise<number | null>;
  saveLastCheckAtMs(ms: number): Promise<void>;
}

export interface OtaUpdatesClient {
  readonly isEnabled: boolean;
  readonly currentlyRunningUpdateId: string | null;
  readonly runtimeVersion: string | null;
  checkForUpdate(): Promise<{ isAvailable: boolean; updateId: string | null }>;
  fetchUpdate(): Promise<{ isNew: boolean; updateId: string | null }>;
  reload(): Promise<void>;
}

export type OtaReport = (message: string, extra?: Record<string, unknown>) => void;

export type OtaSafeEvaluation =
  | { safe: true; reason: 'safe' }
  | { safe: false; reason: string };

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const OTA_SAFE_ROUTE_SET = new Set<string>([
  '/',
  '/index',
  'index',
  '/(tabs)',
  '(tabs)',
  '/(tabs)/index',
  '(tabs)/index',
  '/(tabs)/home',
  '(tabs)/home',
  '/(tabs)/conditions',
  '(tabs)/conditions',
  '/(tabs)/analytics',
  '(tabs)/analytics',
  '/(tabs)/settings',
  '(tabs)/settings',
]);

/** True only for a tab root. Unknown / empty / nested routes are unsafe. */
export function isOtaSafeRoute(route: string | null | undefined): boolean {
  if (typeof route !== 'string') return false;
  const trimmed = route.trim();
  if (!trimmed) return false;
  const path = trimmed.split('?')[0].split('#')[0];
  if (OTA_SAFE_ROUTE_SET.has(path)) return true;
  const withoutTrailing = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  if (OTA_SAFE_ROUTE_SET.has(withoutTrailing)) return true;
  return false;
}

/**
 * Fail-closed safe-boundary evaluation. Every unknown input is unsafe.
 * Order is deterministic for tests: purchase/restore → prompt → camera →
 * walking/propped → foreground → route.
 */
export function evaluateSafeBoundary(input: OtaSafetyInput): OtaSafeEvaluation {
  if (input.purchaseOrRestoreBusy == null) return { safe: false, reason: 'unknown-purchase-busy' };
  if (input.purchaseOrRestoreBusy) return { safe: false, reason: 'purchase-or-restore-busy' };
  if (input.permissionPromptPending == null) return { safe: false, reason: 'unknown-prompt' };
  if (input.permissionPromptPending) return { safe: false, reason: 'permission-prompt-pending' };
  if (input.cameraActive == null) return { safe: false, reason: 'unknown-camera' };
  if (input.cameraActive) return { safe: false, reason: 'camera-active' };
  if (input.walkingActive == null) return { safe: false, reason: 'unknown-walking' };
  if (input.walkingActive) return { safe: false, reason: 'walking-active' };
  if (input.proppedActive == null) return { safe: false, reason: 'unknown-propped' };
  if (input.proppedActive) return { safe: false, reason: 'propped-active' };
  if (input.isForeground == null) return { safe: false, reason: 'unknown-foreground' };
  if (!input.isForeground) return { safe: false, reason: 'not-foreground' };
  if (!isOtaSafeRoute(input.route)) return { safe: false, reason: 'non-root-route' };
  return { safe: true, reason: 'safe' };
}

/** Due only when backgrounded long enough AND last check is stale. */
export function isOtaCheckDue(args: {
  nowMs: number;
  backgroundedAtMs: number | null | undefined;
  lastCheckAtMs: number | null | undefined;
}): boolean {
  const { nowMs, backgroundedAtMs, lastCheckAtMs } = args;
  if (backgroundedAtMs == null) return false;
  if (!Number.isFinite(nowMs) || !Number.isFinite(backgroundedAtMs)) return false;
  if (nowMs - backgroundedAtMs < OTA_FOREGROUND_STALE_MS) return false;
  if (lastCheckAtMs != null) {
    if (!Number.isFinite(lastCheckAtMs)) return false;
    if (nowMs - lastCheckAtMs < OTA_FOREGROUND_STALE_MS) return false;
  }
  return true;
}

export class OtaBudgetTimeoutError extends Error {
  readonly budgetMs: number;
  constructor(budgetMs: number) {
    super(`OTA budget exceeded after ${budgetMs}ms`);
    this.name = 'OtaBudgetTimeoutError';
    this.budgetMs = budgetMs;
  }
}

export class OtaAuthorityRevokedError extends Error {
  constructor() {
    super('OTA authority revoked (timeout or superseded)');
    this.name = 'OtaAuthorityRevokedError';
  }
}

// ---------------------------------------------------------------------------
// Storage factories
// ---------------------------------------------------------------------------

export function createMemoryOtaStorage(initial?: {
  guard?: OtaPersistedGuard | null;
  envelope?: OtaResumeEnvelope | null;
  lastCheckAtMs?: number | null;
}): OtaStorage {
  let guard: OtaPersistedGuard | null = initial?.guard ?? null;
  let envelope: OtaResumeEnvelope | null = initial?.envelope ?? null;
  let lastCheckAtMs: number | null = initial?.lastCheckAtMs ?? null;
  return {
    async loadGuard() {
      return guard;
    },
    async saveGuard(next) {
      guard = { ...next };
    },
    async clearGuard() {
      guard = null;
    },
    async loadEnvelope() {
      return envelope;
    },
    async saveEnvelope(next) {
      envelope = { ...next, draftIds: [...next.draftIds] };
    },
    async loadLastCheckAtMs() {
      return lastCheckAtMs;
    },
    async saveLastCheckAtMs(ms) {
      lastCheckAtMs = ms;
    },
  };
}

export function createAsyncStorageOtaStorage(): OtaStorage {
  const readJson = async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };
  return {
    async loadGuard() {
      const v = await readJson<OtaPersistedGuard>(OTA_GUARD_KEY);
      if (!v || typeof v.updateId !== 'string' || !v.updateId || !Number.isFinite(v.launchCount)) return null;
      return { updateId: v.updateId, launchCount: Math.max(0, Math.floor(v.launchCount)) };
    },
    async saveGuard(guard) {
      try {
        await AsyncStorage.setItem(OTA_GUARD_KEY, JSON.stringify(guard));
      } catch {
        // Persist best-effort; coordinator stays fail-closed in memory.
      }
    },
    async clearGuard() {
      try {
        await AsyncStorage.removeItem(OTA_GUARD_KEY);
      } catch {
        // best-effort
      }
    },
    async loadEnvelope() {
      const v = await readJson<OtaResumeEnvelope>(OTA_ENVELOPE_KEY);
      if (!v || typeof v.route !== 'string' || !Array.isArray(v.draftIds) || !Number.isFinite(v.savedAtMs)) return null;
      return { route: v.route, draftIds: v.draftIds.filter((d) => typeof d === 'string'), savedAtMs: v.savedAtMs };
    },
    async saveEnvelope(envelope) {
      try {
        await AsyncStorage.setItem(OTA_ENVELOPE_KEY, JSON.stringify(envelope));
      } catch {
        // best-effort; reload still proceeds only when safe.
      }
    },
    async loadLastCheckAtMs() {
      const raw = await readJson<number>(OTA_LAST_CHECK_KEY);
      // Stored as bare number JSON.
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      return null;
    },
    async saveLastCheckAtMs(ms) {
      try {
        await AsyncStorage.setItem(OTA_LAST_CHECK_KEY, JSON.stringify(ms));
      } catch {
        // best-effort
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Real client (SDK57 modern calls only)
// ---------------------------------------------------------------------------

/** Wraps `expo-updates` SDK57: check/fetch/reload + observed ids. */
export function createExpoUpdatesClient(): OtaUpdatesClient {
  return {
    get isEnabled() {
      try {
        return Updates.isEnabled;
      } catch {
        return false;
      }
    },
    get currentlyRunningUpdateId() {
      try {
        return Updates.updateId ?? null;
      } catch {
        return null;
      }
    },
    get runtimeVersion() {
      try {
        return Updates.runtimeVersion ?? null;
      } catch {
        return null;
      }
    },
    async checkForUpdate() {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        const id = (res.manifest as unknown as { id?: unknown } | undefined)?.id;
        return { isAvailable: true, updateId: typeof id === 'string' ? id : null };
      }
      return { isAvailable: false, updateId: null };
    },
    async fetchUpdate() {
      const res = await Updates.fetchUpdateAsync();
      if (res.isNew) {
        const id = (res.manifest as unknown as { id?: unknown } | undefined)?.id;
        return { isNew: true, updateId: typeof id === 'string' ? id : null };
      }
      return { isNew: false, updateId: null };
    },
    async reload() {
      await Updates.reloadAsync();
    },
  };
}

// ---------------------------------------------------------------------------
// Observability context for root/T06 (no direct Sentry/PostHog imports here)
// ---------------------------------------------------------------------------

export type OtaObservabilityContext = {
  update_id: string | null;
  runtime_version: string | null;
  channel: string | null;
  is_embedded: boolean | null;
};

export function getOtaObservabilityContext(client?: Pick<OtaUpdatesClient, 'currentlyRunningUpdateId' | 'runtimeVersion'>): OtaObservabilityContext {
  if (!client) {
    try {
      return {
        update_id: Updates.updateId ?? null,
        runtime_version: Updates.runtimeVersion ?? null,
        channel: (Updates as unknown as { channel?: string | null }).channel ?? null,
        is_embedded: (Updates as unknown as { isEmbeddedLaunch?: boolean }).isEmbeddedLaunch ?? null,
      };
    } catch {
      return { update_id: null, runtime_version: null, channel: null, is_embedded: null };
    }
  }
  return {
    update_id: client.currentlyRunningUpdateId,
    runtime_version: client.runtimeVersion,
    channel: null,
    is_embedded: null,
  };
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export type OtaForegroundArgs = {
  nowMs: number;
  backgroundedAtMs: number | null | undefined;
  safety: OtaSafetyInput;
  envelope?: { route: string; draftIds: string[] } | null;
};

export type OtaForegroundResult =
  | { status: 'suppressed-first-launch' }
  | { status: 'suppressed-disabled' }
  | { status: 'suppressed-not-due'; backgroundDurationMs: number; sinceLastCheckMs: number | null }
  | { status: 'busy' }
  | { status: 'no-update' }
  | { status: 'staged'; updateId: string }
  | { status: 'reloaded'; updateId: string }
  | { status: 'deferred-unsafe'; reason: string; updateId: string }
  | { status: 'blocked-loop-guard'; updateId: string }
  | { status: 'failed'; error: string };

export type OtaReloadResult =
  | { status: 'reloaded'; updateId: string }
  | { status: 'deferred-unsafe'; reason: string; updateId: string }
  | { status: 'blocked-loop-guard'; updateId: string }
  | { status: 'no-pending' }
  | { status: 'suppressed-disabled' }
  | { status: 'failed'; error: string };

export type OtaCoordinatorDeps = {
  updates: OtaUpdatesClient;
  storage: OtaStorage;
  now?: () => number;
  report?: OtaReport;
  checkBudgetMs?: number;
  fetchBudgetMs?: number;
};

export class OtaCoordinator {
  private readonly updates: OtaUpdatesClient;
  private readonly storage: OtaStorage;
  private readonly nowFn: () => number;
  private readonly report: OtaReport | undefined;
  private readonly checkBudgetMs: number;
  private readonly fetchBudgetMs: number;

  private epoch = 0;
  private inFlight: Promise<unknown> | null = null;
  private busy = false;
  private startupObserved = false;
  private pendingUpdateId: string | null = null;

  constructor(deps: OtaCoordinatorDeps) {
    this.updates = deps.updates;
    this.storage = deps.storage;
    this.nowFn = deps.now ?? (() => Date.now());
    this.report = deps.report;
    this.checkBudgetMs = deps.checkBudgetMs ?? OTA_CHECK_BUDGET_MS;
    this.fetchBudgetMs = deps.fetchBudgetMs ?? OTA_FETCH_BUDGET_MS;
  }

  /** Observe native `ON_LOAD` outcome. Never triggers a network check. */
  observeStartup(args: {
    currentlyRunningUpdateId?: string | null;
    downloadedUpdateId?: string | null;
    availableUpdateId?: string | null;
  }): void {
    this.startupObserved = true;
    const downloaded = args.downloadedUpdateId ?? null;
    // Prefer the already-downloaded id; fall back to available only as pending
    // metadata (still requires an explicit fetch before reload).
    this.pendingUpdateId = typeof downloaded === 'string' && downloaded ? downloaded : null;
  }

  get isStartupObserved(): boolean {
    return this.startupObserved;
  }

  get pendingId(): string | null {
    return this.pendingUpdateId;
  }

  /**
   * The only path that clears the reload-loop guard. Call when the currently
   * running update has reached the coordinator steady milestone (hook mounted
   * above guards and observed the running update). No other method clears.
   */
  async markSuccessfulLaunch(runningUpdateId: string | null | undefined): Promise<void> {
    if (typeof runningUpdateId !== 'string' || !runningUpdateId) return;
    const guard = await this.storage.loadGuard();
    if (guard && guard.updateId === runningUpdateId) {
      await this.storage.clearGuard();
    }
  }

  private async withBudget<T>(work: Promise<T>, budgetMs: number, epochAtStart: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Revoke authority so late work cannot reload.
          if (this.epoch === epochAtStart) this.epoch += 1;
          reject(new OtaBudgetTimeoutError(budgetMs));
        }, budgetMs);
      });
      const guarded = work.then(
        (value) => {
          if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
          return value;
        },
        (error) => {
          if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
          throw error;
        },
      );
      // Both branches are guarded by the epoch check above, so a timed-out
      // loser can never proceed to reload.
      return await Promise.race([guarded, timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /** Foreground after background: check→fetch (separate budgets), then reload if safe. */
  async onForeground(args: OtaForegroundArgs): Promise<OtaForegroundResult> {
    if (!this.startupObserved) {
      return { status: 'suppressed-first-launch' };
    }
    if (args.backgroundedAtMs == null) {
      return { status: 'suppressed-first-launch' };
    }
    if (!this.updates.isEnabled) {
      return { status: 'suppressed-disabled' };
    }
    if (this.busy || this.inFlight) {
      return { status: 'busy' };
    }
    // Acquire synchronously before the first await so concurrent callers see busy.
    this.busy = true;
    const nowMs = args.nowMs;
    const backgroundDurationMs = nowMs - (args.backgroundedAtMs as number);
    let lastCheckAtMs: number | null;
    try {
      lastCheckAtMs = await this.storage.loadLastCheckAtMs();
    } catch {
      this.busy = false;
      return { status: 'failed', error: 'storage unavailable' };
    }
    const sinceLastCheckMs = lastCheckAtMs == null ? null : nowMs - lastCheckAtMs;
    if (!isOtaCheckDue({ nowMs, backgroundedAtMs: args.backgroundedAtMs, lastCheckAtMs })) {
      this.busy = false;
      return { status: 'suppressed-not-due', backgroundDurationMs, sinceLastCheckMs };
    }

    const epochAtStart = this.epoch;
    const operation: Promise<OtaForegroundResult> = (async () => {
      // Separate budgets: check first, then fetch. A check timeout revokes the
      // epoch so the fetch below can never run or reload.
      let check: { isAvailable: boolean; updateId: string | null };
      try {
        check = await this.withBudget(this.updates.checkForUpdate(), this.checkBudgetMs, epochAtStart);
      } catch (error) {
        await this.storage.saveLastCheckAtMs(nowMs);
        return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
      }
      await this.storage.saveLastCheckAtMs(nowMs);
      if (!check.isAvailable) {
        return { status: 'no-update' };
      }
      let fetched: { isNew: boolean; updateId: string | null };
      try {
        fetched = await this.withBudget(this.updates.fetchUpdate(), this.fetchBudgetMs, epochAtStart);
      } catch (error) {
        return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
      }
      if (!fetched.isNew) {
        return { status: 'no-update' };
      }
      const stagedId = fetched.updateId ?? check.updateId;
      if (!stagedId) {
        return { status: 'failed', error: 'missing staged update id' };
      }
      if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
      this.pendingUpdateId = stagedId;
      // Attempt apply at the next safe boundary using the same epoch.
      const reloadResult = await this.reloadIfSafeInternal(args.safety, args.envelope ?? null, nowMs, epochAtStart);
      if (reloadResult.status === 'no-pending') {
        return { status: 'failed' as const, error: 'missing staged update' };
      }
      return reloadResult;
    })();

    this.inFlight = operation;
    try {
      return await operation;
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    } finally {
      if (this.inFlight === operation) this.inFlight = null;
      this.busy = false;
    }
  }

  /** Explicit check→fetch without reload (tests / diagnostics). Same budgets. */
  async checkAndStage(nowMs?: number): Promise<
    | { status: 'staged'; updateId: string }
    | { status: 'no-update' }
    | { status: 'suppressed-disabled' }
    | { status: 'suppressed-first-launch' }
    | { status: 'busy' }
    | { status: 'failed'; error: string }
  > {
    if (!this.startupObserved) return { status: 'suppressed-first-launch' };
    if (!this.updates.isEnabled) return { status: 'suppressed-disabled' };
    if (this.busy || this.inFlight) return { status: 'busy' };
    this.busy = true;
    const at = nowMs ?? this.nowFn();
    const epochAtStart = this.epoch;
    const operation = (async () => {
      let check: { isAvailable: boolean; updateId: string | null };
      try {
        check = await this.withBudget(this.updates.checkForUpdate(), this.checkBudgetMs, epochAtStart);
      } catch (error) {
        await this.storage.saveLastCheckAtMs(at);
        return { status: 'failed' as const, error: error instanceof Error ? error.message : String(error) };
      }
      await this.storage.saveLastCheckAtMs(at);
      if (!check.isAvailable) return { status: 'no-update' as const };
      let fetched: { isNew: boolean; updateId: string | null };
      try {
        fetched = await this.withBudget(this.updates.fetchUpdate(), this.fetchBudgetMs, epochAtStart);
      } catch (error) {
        return { status: 'failed' as const, error: error instanceof Error ? error.message : String(error) };
      }
      if (!fetched.isNew) return { status: 'no-update' as const };
      const stagedId = fetched.updateId ?? check.updateId;
      if (!stagedId) return { status: 'failed' as const, error: 'missing staged update id' };
      if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
      this.pendingUpdateId = stagedId;
      return { status: 'staged' as const, updateId: stagedId };
    })();
    this.inFlight = operation;
    try {
      return await operation;
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    } finally {
      if (this.inFlight === operation) this.inFlight = null;
      this.busy = false;
    }
  }

  /** Attempt reload of the staged update if the boundary is safe. */
  async tryReloadIfSafe(args: {
    safety: OtaSafetyInput;
    envelope?: { route: string; draftIds: string[] } | null;
    nowMs?: number;
  }): Promise<OtaReloadResult> {
    if (!this.updates.isEnabled) return { status: 'suppressed-disabled' };
    if (this.busy || this.inFlight) return { status: 'failed', error: 'operation in flight' };
    this.busy = true;
    const at = args.nowMs ?? this.nowFn();
    const epochAtStart = this.epoch;
    const operation: Promise<OtaReloadResult> = this.reloadIfSafeInternal(
      args.safety,
      args.envelope ?? null,
      at,
      epochAtStart,
    );
    this.inFlight = operation;
    try {
      return await operation;
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    } finally {
      if (this.inFlight === operation) this.inFlight = null;
      this.busy = false;
    }
  }

  private async reloadIfSafeInternal(
    safety: OtaSafetyInput,
    envelope: { route: string; draftIds: string[] } | null,
    nowMs: number,
    epochAtStart: number,
  ): Promise<OtaReloadResult> {
    const pending = this.pendingUpdateId;
    if (!pending) return { status: 'no-pending' };
    const guard = await this.storage.loadGuard();
    if (guard && guard.updateId === pending && guard.launchCount >= OTA_MAX_RELOAD_ATTEMPTS) {
      try {
        this.report?.('ota.loop-guard-blocked', { updateId: pending, launchCount: guard.launchCount });
      } catch {
        // reporting never blocks the guard
      }
      return { status: 'blocked-loop-guard', updateId: pending };
    }
    const evaluation = evaluateSafeBoundary(safety);
    if (!evaluation.safe) {
      return { status: 'deferred-unsafe', reason: evaluation.reason, updateId: pending };
    }
    if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
    // Persist resume envelope before reloading.
    const toSave: OtaResumeEnvelope = {
      route: envelope?.route ?? (typeof safety.route === 'string' ? safety.route : '/'),
      draftIds: Array.isArray(envelope?.draftIds) ? envelope.draftIds.filter((d) => typeof d === 'string') : [],
      savedAtMs: nowMs,
    };
    await this.storage.saveEnvelope(toSave);
    const nextCount = guard && guard.updateId === pending ? guard.launchCount + 1 : 1;
    await this.storage.saveGuard({ updateId: pending, launchCount: nextCount });
    if (this.epoch !== epochAtStart) {
      // Authority was revoked while persisting; do not reload.
      throw new OtaAuthorityRevokedError();
    }
    await this.updates.reload();
    return { status: 'reloaded', updateId: pending };
  }
}

export function createOtaCoordinator(deps: OtaCoordinatorDeps): OtaCoordinator {
  return new OtaCoordinator(deps);
}

// ---------------------------------------------------------------------------
// Hook (mount above guards; DI for tests)
// ---------------------------------------------------------------------------

export type OtaCoordinatorHookOptions = {
  coordinator?: OtaCoordinator;
  getSafety?: () => OtaSafetyInput;
  getEnvelope?: () => { route: string; draftIds: string[] } | null;
  now?: () => number;
  report?: OtaReport;
};

const OTA_UNKNOWN_SAFETY: OtaSafetyInput = {
  purchaseOrRestoreBusy: null,
  permissionPromptPending: null,
  cameraActive: null,
  walkingActive: null,
  proppedActive: null,
  isForeground: null,
  route: null,
};

/**
 * Mount at the runtime root above guards. Observes `useUpdates()` only on
 * launch (no duplicate JS check), marks the steady milestone once, then
 * handles background→foreground transitions. Unknown safety fails closed via
 * the default provider.
 */
export function useOtaCoordinator(options?: OtaCoordinatorHookOptions): OtaCoordinator {
  const ref = useRef<OtaCoordinator | null>(null);
  if (!ref.current) {
    ref.current =
      options?.coordinator ??
      createOtaCoordinator({
        updates: createExpoUpdatesClient(),
        storage: createAsyncStorageOtaStorage(),
        now: options?.now,
        report: options?.report,
      });
  }
  const coordinator = ref.current as OtaCoordinator;
  const observed = Updates.useUpdates();
  const getSafety = options?.getSafety;
  const getEnvelope = options?.getEnvelope;
  const nowFn = options?.now ?? (() => Date.now());
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const runningId =
      (observed?.currentlyRunning?.updateId as string | undefined) ?? null;
    const downloaded = observed?.downloadedUpdate as unknown as
      | { updateId?: unknown }
      | undefined;
    const downloadedId = typeof downloaded?.updateId === 'string' ? (downloaded.updateId as string) : null;
    coordinator.observeStartup({ currentlyRunningUpdateId: runningId, downloadedUpdateId: downloadedId });
    // Steady milestone: JS reached the coordinator with the running update.
    void coordinator.markSuccessfulLaunch(runningId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinator]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        try {
          backgroundedAtRef.current = nowFn();
        } catch {
          backgroundedAtRef.current = null;
        }
        return;
      }
      if (state === 'active') {
        const backgroundedAtMs = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        const safety = (() => {
          try {
            return getSafety?.() ?? OTA_UNKNOWN_SAFETY;
          } catch {
            return OTA_UNKNOWN_SAFETY;
          }
        })();
        const envelope = (() => {
          try {
            return getEnvelope?.() ?? null;
          } catch {
            return null;
          }
        })();
        let nowMs: number;
        try {
          nowMs = nowFn();
        } catch {
          return;
        }
        void coordinator.onForeground({ nowMs, backgroundedAtMs, safety, envelope });
      }
    });
    return () => subscription.remove();
  }, [coordinator, getSafety, getEnvelope, nowFn]);

  return coordinator;
}

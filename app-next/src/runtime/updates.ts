/**
 * T03 OTA coordinator — single owner of every `expo-updates` call.
 *
 * Mount contract (root-owned): mount `useOtaCoordinator` at the runtime root,
 * above every guard. The coordinator never gates on paywall or setup state;
 * it only receives primitive safe-boundary inputs via LIVE getters (DI).
 * Fail closed when any safety input is unknown or any getter throws.
 *
 * First launch: native `ON_LOAD` owns check+download inside
 * `fallbackToCacheTimeout`. JS only observes `useUpdates()` via
 * `observeStartup()` and never issues a duplicate check on the same launch.
 * Later native downloads are observed via `observeDownloadedUpdate()` without
 * repeated startup checks and without resetting staged state. An observed
 * download gains reload authority only on a genuinely new foreground
 * (generation advances); a timed-out fetch result can never be resurrected
 * through observation in the same foreground.
 *
 * Later: on foreground, an eligible pending update is attempted FIRST
 * regardless of the 6h check cadence, with fresh live safety; unsafe defers
 * until another foreground. Otherwise after >= 6h in background,
 * `checkForUpdateAsync` then `fetchUpdateAsync` with SEPARATE budgets, then
 * `reloadAsync` only at a safe boundary with live revalidation immediately
 * before reload after EVERY async write. Reload-loop guard persists
 * `{ updateId, launchCount }` and stops after two failed activations of one
 * update id. `markSuccessfulLaunch` is the ONLY path that clears the guard —
 * T10 calls it after hydrated stable app; the hook never auto-clears on mount.
 * A pending id equal to the currently running id is rejected and cleared
 * (never retried).
 *
 * Required guard/envelope persistence failures deny reload and report.
 * Corrupt persisted guard throws (never silently resets retry authority).
 * Last-check persistence is best-effort only (explicitly distinct, never
 * denies reload).
 *
 * No unsafe reload races: every budgeted operation captures an epoch. Timeout
 * revokes the epoch; late work that resolves after revocation throws instead
 * of reloading. No concurrent checks/reloads: `inFlight` serializes work.
 *
 * Safe routes are actual expo-router tab paths with groups excluded
 * (`/home`, `/conditions`, `/analytics`, `/settings`). `'/'` is the BootGate
 * transient (redirects after onboarding guard) and is NEVER safe — root must
 * provide the live pathname (e.g. `/home`) via the safety getter; the
 * coordinator normalizes legacy `/(tabs)/…` Stack names to the same canonical
 * paths but never guesses arbitrary routes.
 *
 * Code-signing note: Expo account is Free, so the conditional signing
 * requirement is not enabled. No keys are created here and no tamper
 * verification is claimed.
 */
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
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

/**
 * LIVE safety getter. Called fresh immediately before reload and after EVERY
 * async write. Must return the latest values (hook reads via refs + real
 * `AppState.currentState`). If it throws, the coordinator fails closed
 * (defers as unsafe, never reloads).
 */
export type OtaSafetyGetter = () => OtaSafetyInput;

/**
 * LIVE envelope getter. Called fresh at reload time. If it throws, reload is
 * denied (failed) — envelope persistence is required, never best-effort.
 */
export type OtaEnvelopeGetter = () => { route: string; draftIds: string[] } | null;

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
// Pure helpers — actual expo-router tab paths (groups excluded)
// ---------------------------------------------------------------------------

/**
 * Canonical safe tab roots as returned by `usePathname()` (groups excluded).
 * `'/'` is BootGate (transient redirect) and is intentionally NOT safe.
 * Legacy Stack screen names containing groups (e.g. `/(tabs)/home`) normalize
 * to the same canonical paths (see `normalizeOtaRoute`).
 */
const OTA_SAFE_ROUTE_SET = new Set<string>([
  '/home',
  '/conditions',
  '/analytics',
  '/settings',
]);

/**
 * Normalize a route string to its canonical group-excluded pathname.
 * Strips query/hash, trailing slash, and any `(group)` segments.
 * Returns `'/'` for the root/empty/group-only paths (which is unsafe).
 * Returns null for non-string/empty input (unsafe).
 */
export function normalizeOtaRoute(route: string | null | undefined): string | null {
  if (typeof route !== 'string') return null;
  const trimmed = route.trim();
  if (!trimmed) return null;
  const withoutQuery = trimmed.split('?')[0].split('#')[0].trim();
  if (!withoutQuery) return null;
  const withoutTrailing =
    withoutQuery.length > 1 && withoutQuery.endsWith('/') ? withoutQuery.slice(0, -1) : withoutQuery;
  const segments = withoutTrailing
    .split('/')
    .filter((s) => s.length > 0 && !(s.startsWith('(') && s.endsWith(')')));
  if (segments.length === 0) return '/';
  return '/' + segments.join('/');
}

/** True only for a canonical tab root. Unknown / BootGate / nested routes are unsafe. */
export function isOtaSafeRoute(route: string | null | undefined): boolean {
  const normalized = normalizeOtaRoute(route);
  if (!normalized) return false;
  return OTA_SAFE_ROUTE_SET.has(normalized);
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

export class OtaStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtaStorageError';
  }
}

export class OtaCorruptGuardError extends OtaStorageError {
  constructor(message = 'OTA persisted guard is corrupt') {
    super(message);
    this.name = 'OtaCorruptGuardError';
  }
}

export class OtaCorruptEnvelopeError extends OtaStorageError {
  constructor(message = 'OTA persisted envelope is corrupt') {
    super(message);
    this.name = 'OtaCorruptEnvelopeError';
  }
}

// ---------------------------------------------------------------------------
// Storage factories — required guard/envelope fail closed; last-check best-effort
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
  return {
    async loadGuard() {
      let raw: string | null;
      try {
        raw = await AsyncStorage.getItem(OTA_GUARD_KEY);
      } catch (error) {
        // Required read failure must deny reload (coordinator catches).
        throw new OtaStorageError(`OTA guard read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (raw == null || raw === '') return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Corrupt persisted guard must NOT silently reset retry authority.
        throw new OtaCorruptGuardError('OTA guard JSON is corrupt; refusing to reset retry authority');
      }
      const v = parsed as Partial<OtaPersistedGuard> | null;
      if (!v || typeof v.updateId !== 'string' || !v.updateId || !Number.isFinite(v.launchCount as number)) {
        throw new OtaCorruptGuardError('OTA guard shape is invalid; refusing to reset retry authority');
      }
      return { updateId: v.updateId, launchCount: Math.max(0, Math.floor(v.launchCount as number)) };
    },
    async saveGuard(guard) {
      // Required write failure must propagate so the coordinator denies reload.
      // Intentionally NO try/catch here (fail closed, not best-effort).
      await AsyncStorage.setItem(OTA_GUARD_KEY, JSON.stringify(guard));
    },
    async clearGuard() {
      // Clearing is required for the success milestone; propagate failures
      // so a stale guard is never silently assumed cleared.
      await AsyncStorage.removeItem(OTA_GUARD_KEY);
    },
    async loadEnvelope() {
      let raw: string | null;
      try {
        raw = await AsyncStorage.getItem(OTA_ENVELOPE_KEY);
      } catch (error) {
        throw new OtaStorageError(`OTA envelope read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (raw == null || raw === '') return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new OtaCorruptEnvelopeError('OTA envelope JSON is corrupt');
      }
      const v = parsed as Partial<OtaResumeEnvelope> | null;
      if (
        !v ||
        typeof v.route !== 'string' ||
        !Array.isArray((v as { draftIds?: unknown }).draftIds) ||
        !Number.isFinite(v.savedAtMs as number)
      ) {
        throw new OtaCorruptEnvelopeError('OTA envelope shape is invalid');
      }
      const vv = v as OtaResumeEnvelope;
      return {
        route: vv.route,
        draftIds: vv.draftIds.filter((d) => typeof d === 'string'),
        savedAtMs: vv.savedAtMs,
      };
    },
    async saveEnvelope(envelope) {
      // Required write failure must propagate so the coordinator denies reload.
      await AsyncStorage.setItem(OTA_ENVELOPE_KEY, JSON.stringify(envelope));
    },
    async loadLastCheckAtMs() {
      // Best-effort only (explicitly distinct from required guard/envelope):
      // read failures and corrupt values yield null (stale) and never deny reload.
      try {
        const raw = await AsyncStorage.getItem(OTA_LAST_CHECK_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
        return null;
      } catch {
        return null;
      }
    },
    async saveLastCheckAtMs(ms) {
      // Best-effort only (explicitly distinct): never throws, never denies reload.
      try {
        await AsyncStorage.setItem(OTA_LAST_CHECK_KEY, JSON.stringify(ms));
      } catch {
        // ignore: last-check cadence is advisory; guard/envelope remain required.
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
// Coordinator — LIVE getters, generation-gated observation, pending retry
// ---------------------------------------------------------------------------

export type OtaForegroundArgs = {
  nowMs: number;
  backgroundedAtMs: number | null | undefined;
  /** LIVE safety getter (fail closed if it throws). Required. */
  getSafety: OtaSafetyGetter;
  /** LIVE envelope getter (fail closed if it throws). Optional; null when absent. */
  getEnvelope?: OtaEnvelopeGetter | null;
};

export type OtaForegroundResult =
  | { status: 'suppressed-first-launch' }
  | { status: 'suppressed-disabled' }
  | { status: 'suppressed-not-due'; backgroundDurationMs: number; sinceLastCheckMs: number | null }
  | { status: 'busy' }
  | { status: 'no-update' }
  | { status: 'reloaded'; updateId: string }
  | { status: 'deferred-unsafe'; reason: string; updateId: string }
  | { status: 'blocked-loop-guard'; updateId: string }
  | { status: 'already-running'; updateId: string }
  | { status: 'failed'; error: string };

export type OtaReloadResult =
  | { status: 'reloaded'; updateId: string }
  | { status: 'deferred-unsafe'; reason: string; updateId: string }
  | { status: 'blocked-loop-guard'; updateId: string }
  | { status: 'already-running'; updateId: string }
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

type OtaPendingSource = 'fetch' | 'startup' | 'observation' | null;

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
  private pendingSource: OtaPendingSource = null;
  private pendingStagedAtSeq: number | null = null;
  private foregroundSeq = 0;
  private lastRunningId: string | null = null;
  private lastDownloadedId: string | null = null;

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
    const running = typeof args.currentlyRunningUpdateId === 'string' ? args.currentlyRunningUpdateId : null;
    if (running) this.lastRunningId = running;
    const downloaded = typeof args.downloadedUpdateId === 'string' && args.downloadedUpdateId ? args.downloadedUpdateId : null;
    this.lastDownloadedId = downloaded;
    if (!downloaded) return;
    // Never stage (or retry) the currently running id.
    try {
      const liveRunning = this.safeRunningId();
      if (liveRunning && downloaded === liveRunning) {
        if (this.pendingUpdateId === downloaded) {
          this.pendingUpdateId = null;
          this.pendingSource = null;
          this.pendingStagedAtSeq = null;
        }
        return;
      }
    } catch {
      // If running id is unreadable, fail closed: do not stage.
      return;
    }
    if (running && downloaded === running) {
      if (this.pendingUpdateId === downloaded) {
        this.pendingUpdateId = null;
        this.pendingSource = null;
        this.pendingStagedAtSeq = null;
      }
      return;
    }
    // Startup download has immediate authority (no fresh-foreground delay);
    // it applies at the next safe boundary without a second launch check.
    // Do not overwrite a different already-staged id (preserve staged state).
    if (this.pendingUpdateId && this.pendingUpdateId !== downloaded) return;
    this.pendingUpdateId = downloaded;
    this.pendingSource = 'startup';
    this.pendingStagedAtSeq = this.foregroundSeq;
  }

  /**
   * Observe a later native download (`useUpdates().downloadedUpdate`) without
   * issuing a startup check and without resetting unrelated staged state.
   * An observed id gains reload authority only on a genuinely new foreground
   * (`foregroundSeq` advances); the same foreground can never reload it, so a
   * timed-out fetch result cannot be resurrected through observation.
   */
  observeDownloadedUpdate(
    downloadedUpdateId: string | null | undefined,
    currentlyRunningUpdateId?: string | null | undefined,
  ): void {
    const downloaded = typeof downloadedUpdateId === 'string' && downloadedUpdateId ? downloadedUpdateId : null;
    const runningArg = typeof currentlyRunningUpdateId === 'string' ? currentlyRunningUpdateId : null;
    if (downloaded) this.lastDownloadedId = downloaded;
    if (runningArg) this.lastRunningId = runningArg;
    if (!downloaded) return;
    // Never stage the currently running id; clear it if it is pending.
    const liveRunning = runningArg ?? this.safeRunningIdOrNull();
    if (liveRunning && downloaded === liveRunning) {
      if (this.pendingUpdateId === downloaded) {
        this.pendingUpdateId = null;
        this.pendingSource = null;
        this.pendingStagedAtSeq = null;
      }
      return;
    }
    // Preserve unrelated staged state: do not overwrite a different pending id.
    if (this.pendingUpdateId && this.pendingUpdateId !== downloaded) return;
    // Same id already staged: preserve its original source/seq (authority timing).
    if (this.pendingUpdateId === downloaded) return;
    this.pendingUpdateId = downloaded;
    this.pendingSource = 'observation';
    this.pendingStagedAtSeq = this.foregroundSeq;
  }

  get isStartupObserved(): boolean {
    return this.startupObserved;
  }

  get pendingId(): string | null {
    return this.pendingUpdateId;
  }

  /**
   * The ONLY path that clears the reload-loop guard. T10 calls this after the
   * hydrated stable app milestone (never auto-called on mount). No other
   * method clears. Required storage failures propagate (fail closed).
   */
  async markSuccessfulLaunch(runningUpdateId: string | null | undefined): Promise<void> {
    if (typeof runningUpdateId !== 'string' || !runningUpdateId) return;
    const guard = await this.storage.loadGuard();
    if (guard && guard.updateId === runningUpdateId) {
      await this.storage.clearGuard();
    }
  }

  private safeRunningId(): string | null {
    return this.updates.currentlyRunningUpdateId;
  }

  private safeRunningIdOrNull(): string | null {
    try {
      return this.updates.currentlyRunningUpdateId;
    } catch {
      return null;
    }
  }

  private safeIsEnabled(): boolean {
    return this.updates.isEnabled;
  }

  private emitReport(message: string, extra?: Record<string, unknown>): void {
    try {
      this.report?.(message, extra);
    } catch {
      // reporting never blocks the guard
    }
  }

  private readLiveSafety(getSafety: OtaSafetyGetter | null | undefined): OtaSafetyInput {
    if (typeof getSafety !== 'function') {
      throw new Error('ota safety getter missing');
    }
    return getSafety();
  }

  private readLiveEnvelope(
    getEnvelope: OtaEnvelopeGetter | null | undefined,
  ): { route: string; draftIds: string[] } | null {
    if (getEnvelope == null) return null;
    if (typeof getEnvelope !== 'function') throw new Error('ota envelope getter invalid');
    return getEnvelope();
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

  private async saveLastCheckBestEffort(ms: number): Promise<void> {
    // Best-effort only (explicitly distinct): never throws, never denies reload.
    try {
      await this.storage.saveLastCheckAtMs(ms);
    } catch {
      // ignore
    }
  }

  /** Foreground after background: pending-first, then check→fetch, then reload if safe. */
  async onForeground(args: OtaForegroundArgs): Promise<OtaForegroundResult> {
    if (!this.startupObserved) {
      return { status: 'suppressed-first-launch' };
    }
    if (args.backgroundedAtMs == null) {
      return { status: 'suppressed-first-launch' };
    }
    let enabled: boolean;
    try {
      enabled = this.safeIsEnabled();
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (!enabled) {
      return { status: 'suppressed-disabled' };
    }
    if (this.busy || this.inFlight) {
      return { status: 'busy' };
    }
    // Acquire synchronously before the first await so concurrent callers see busy.
    this.busy = true;
    // Advance generation FIRST so observation authority can be gated on it.
    this.foregroundSeq += 1;
    const currentSeq = this.foregroundSeq;
    const nowMs = args.nowMs;
    const backgroundDurationMs = nowMs - (args.backgroundedAtMs as number);
    // Last-check is best-effort only: failures yield null (stale) and never deny.
    let lastCheckAtMs: number | null = null;
    try {
      lastCheckAtMs = await this.storage.loadLastCheckAtMs();
    } catch {
      lastCheckAtMs = null;
    }
    const sinceLastCheckMs = lastCheckAtMs == null ? null : nowMs - lastCheckAtMs;

    // Eligible pending update is attempted FIRST regardless of 6h cadence,
    // with fresh live safety. Unsafe defers until another foreground.
    if (this.pendingUpdateId) {
      const epochAtStart = this.epoch;
      const operation: Promise<OtaForegroundResult> = (async () => {
        const pendingResult = await this.reloadIfSafeInternal(
          args.getSafety,
          args.getEnvelope ?? null,
          nowMs,
          epochAtStart,
          currentSeq,
        );
        if (pendingResult.status !== 'no-pending') {
          return pendingResult as OtaForegroundResult;
        }
        // No pending (cleared as already-running): continue to check if due.
        if (!isOtaCheckDue({ nowMs, backgroundedAtMs: args.backgroundedAtMs, lastCheckAtMs })) {
          return { status: 'suppressed-not-due', backgroundDurationMs, sinceLastCheckMs };
        }
        return await this.checkFetchAndReload(args, nowMs, epochAtStart, currentSeq);
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

    if (!isOtaCheckDue({ nowMs, backgroundedAtMs: args.backgroundedAtMs, lastCheckAtMs })) {
      this.busy = false;
      return { status: 'suppressed-not-due', backgroundDurationMs, sinceLastCheckMs };
    }

    const epochAtStart = this.epoch;
    const operation: Promise<OtaForegroundResult> = this.checkFetchAndReload(args, nowMs, epochAtStart, currentSeq);

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

  private async checkFetchAndReload(
    args: OtaForegroundArgs,
    nowMs: number,
    epochAtStart: number,
    _currentSeq: number,
  ): Promise<OtaForegroundResult> {
    // Separate budgets: check first, then fetch. A check timeout revokes the
    // epoch so the fetch below can never run or reload.
    let check: { isAvailable: boolean; updateId: string | null };
    const checkPromise = this.updates.checkForUpdate();
    try {
      check = await this.withBudget(checkPromise, this.checkBudgetMs, epochAtStart);
    } catch (error) {
      // Late check resolution must never stage (epoch already revoked).
      void checkPromise.then(
        () => undefined,
        () => undefined,
      );
      await this.saveLastCheckBestEffort(nowMs);
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    await this.saveLastCheckBestEffort(nowMs);
    if (!check.isAvailable) {
      return { status: 'no-update' };
    }
    const fetchPromise = this.updates.fetchUpdate();
    let fetched: { isNew: boolean; updateId: string | null };
    try {
      fetched = await this.withBudget(fetchPromise, this.fetchBudgetMs, epochAtStart);
    } catch (error) {
      void fetchPromise.then(
        () => undefined,
        () => undefined,
      );
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
    // Never stage (or reload) the currently running id.
    try {
      const running = this.safeRunningId();
      if (running && stagedId === running) {
        this.pendingUpdateId = null;
        this.pendingSource = null;
        this.pendingStagedAtSeq = null;
        return { status: 'already-running', updateId: stagedId };
      }
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    this.pendingUpdateId = stagedId;
    this.pendingSource = 'fetch';
    this.pendingStagedAtSeq = this.foregroundSeq;
    // Attempt apply at the next safe boundary using the same epoch, with LIVE safety.
    const reloadResult = await this.reloadIfSafeInternal(
      args.getSafety,
      args.getEnvelope ?? null,
      nowMs,
      epochAtStart,
      this.foregroundSeq,
    );
    if (reloadResult.status === 'no-pending') {
      return { status: 'failed' as const, error: 'missing staged update' };
    }
    return reloadResult;
  }

  /**
   * Explicit check→fetch without reload (diagnostics only; never used by the
   * hook launch path). Same separate budgets. Stages as `fetch` source.
   */
  async checkAndStage(nowMs?: number): Promise<
    | { status: 'staged'; updateId: string }
    | { status: 'no-update' }
    | { status: 'suppressed-disabled' }
    | { status: 'suppressed-first-launch' }
    | { status: 'busy' }
    | { status: 'failed'; error: string }
  > {
    if (!this.startupObserved) return { status: 'suppressed-first-launch' };
    let enabled: boolean;
    try {
      enabled = this.safeIsEnabled();
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (!enabled) return { status: 'suppressed-disabled' };
    if (this.busy || this.inFlight) return { status: 'busy' };
    this.busy = true;
    const at = nowMs ?? this.nowFn();
    const epochAtStart = this.epoch;
    const operation = (async () => {
      const checkPromise = this.updates.checkForUpdate();
      let check: { isAvailable: boolean; updateId: string | null };
      try {
        check = await this.withBudget(checkPromise, this.checkBudgetMs, epochAtStart);
      } catch (error) {
        void checkPromise.then(
          () => undefined,
          () => undefined,
        );
        await this.saveLastCheckBestEffort(at);
        return { status: 'failed' as const, error: error instanceof Error ? error.message : String(error) };
      }
      await this.saveLastCheckBestEffort(at);
      if (!check.isAvailable) return { status: 'no-update' as const };
      const fetchPromise = this.updates.fetchUpdate();
      let fetched: { isNew: boolean; updateId: string | null };
      try {
        fetched = await this.withBudget(fetchPromise, this.fetchBudgetMs, epochAtStart);
      } catch (error) {
        void fetchPromise.then(
          () => undefined,
          () => undefined,
        );
        return { status: 'failed' as const, error: error instanceof Error ? error.message : String(error) };
      }
      if (!fetched.isNew) return { status: 'no-update' as const };
      const stagedId = fetched.updateId ?? check.updateId;
      if (!stagedId) return { status: 'failed' as const, error: 'missing staged update id' };
      if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
      try {
        const running = this.safeRunningId();
        if (running && stagedId === running) {
          this.pendingUpdateId = null;
          this.pendingSource = null;
          this.pendingStagedAtSeq = null;
          return { status: 'failed' as const, error: 'already running' };
        }
      } catch (error) {
        return { status: 'failed' as const, error: error instanceof Error ? error.message : String(error) };
      }
      this.pendingUpdateId = stagedId;
      this.pendingSource = 'fetch';
      this.pendingStagedAtSeq = this.foregroundSeq;
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

  /** Attempt reload of the staged update if the LIVE boundary is safe. */
  async tryReloadIfSafe(args: {
    getSafety: OtaSafetyGetter;
    getEnvelope?: OtaEnvelopeGetter | null;
    nowMs?: number;
  }): Promise<OtaReloadResult> {
    let enabled: boolean;
    try {
      enabled = this.safeIsEnabled();
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (!enabled) return { status: 'suppressed-disabled' };
    if (this.busy || this.inFlight) return { status: 'failed', error: 'operation in flight' };
    this.busy = true;
    let at: number;
    try {
      at = args.nowMs ?? this.nowFn();
    } catch (error) {
      this.busy = false;
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    const epochAtStart = this.epoch;
    const operation: Promise<OtaReloadResult> = this.reloadIfSafeInternal(
      args.getSafety,
      args.getEnvelope ?? null,
      at,
      epochAtStart,
      this.foregroundSeq,
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
    getSafety: OtaSafetyGetter,
    getEnvelope: OtaEnvelopeGetter | null,
    nowMs: number,
    epochAtStart: number,
    currentSeq: number,
  ): Promise<OtaReloadResult> {
    const pending = this.pendingUpdateId;
    if (!pending) return { status: 'no-pending' };
    // Observed downloads require a genuinely new foreground before they gain
    // authority; the same foreground can never reload them (no resurrection).
    if (this.pendingSource === 'observation') {
      const stagedAt = this.pendingStagedAtSeq;
      if (stagedAt == null || stagedAt >= currentSeq) {
        return { status: 'deferred-unsafe', reason: 'needs-fresh-foreground', updateId: pending };
      }
    }
    // Never reload the currently running id; clear it.
    let liveRunning: string | null = null;
    try {
      liveRunning = this.safeRunningId();
    } catch (error) {
      this.emitReport('ota.running-read-failed', { updateId: pending });
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (liveRunning && pending === liveRunning) {
      this.pendingUpdateId = null;
      this.pendingSource = null;
      this.pendingStagedAtSeq = null;
      return { status: 'already-running', updateId: pending };
    }
    // Required guard read: failures (including corrupt) deny reload and report.
    let guard: OtaPersistedGuard | null;
    try {
      guard = await this.storage.loadGuard();
    } catch (error) {
      this.emitReport('ota.guard-read-failed', {
        updateId: pending,
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (guard && guard.updateId === pending && guard.launchCount >= OTA_MAX_RELOAD_ATTEMPTS) {
      this.emitReport('ota.loop-guard-blocked', { updateId: pending, launchCount: guard.launchCount });
      return { status: 'blocked-loop-guard', updateId: pending };
    }
    // LIVE safety evaluation (fail closed if the getter throws).
    let safety: OtaSafetyInput;
    try {
      safety = this.readLiveSafety(getSafety);
    } catch {
      return {
        status: 'deferred-unsafe',
        reason: 'safety-unavailable',
        updateId: pending,
      };
    }
    const evaluation = evaluateSafeBoundary(safety);
    if (!evaluation.safe) {
      return { status: 'deferred-unsafe', reason: evaluation.reason, updateId: pending };
    }
    if (this.epoch !== epochAtStart) throw new OtaAuthorityRevokedError();
    // LIVE envelope (fail closed if the getter throws).
    let envelope: { route: string; draftIds: string[] } | null;
    try {
      envelope = this.readLiveEnvelope(getEnvelope);
    } catch (error) {
      this.emitReport('ota.envelope-read-failed', { updateId: pending });
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    // Persist resume envelope before reloading (required; failures deny).
    const toSave: OtaResumeEnvelope = {
      route: envelope?.route ?? (typeof safety.route === 'string' ? safety.route : '/home'),
      draftIds: Array.isArray(envelope?.draftIds) ? envelope.draftIds.filter((d) => typeof d === 'string') : [],
      savedAtMs: nowMs,
    };
    try {
      await this.storage.saveEnvelope(toSave);
    } catch (error) {
      this.emitReport('ota.envelope-write-failed', { updateId: pending });
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    // Revalidate LIVE safety immediately after the async write; stale state defers.
    try {
      safety = this.readLiveSafety(getSafety);
    } catch {
      return { status: 'deferred-unsafe', reason: 'safety-unavailable', updateId: pending };
    }
    const afterEnvelope = evaluateSafeBoundary(safety);
    if (!afterEnvelope.safe) {
      return { status: 'deferred-unsafe', reason: afterEnvelope.reason, updateId: pending };
    }
    if (this.epoch !== epochAtStart) {
      throw new OtaAuthorityRevokedError();
    }
    const nextCount = guard && guard.updateId === pending ? guard.launchCount + 1 : 1;
    try {
      await this.storage.saveGuard({ updateId: pending, launchCount: nextCount });
    } catch (error) {
      this.emitReport('ota.guard-write-failed', { updateId: pending });
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    // Revalidate LIVE safety immediately before reload after every async write.
    try {
      safety = this.readLiveSafety(getSafety);
    } catch {
      return { status: 'deferred-unsafe', reason: 'safety-unavailable', updateId: pending };
    }
    const beforeReload = evaluateSafeBoundary(safety);
    if (!beforeReload.safe) {
      return { status: 'deferred-unsafe', reason: beforeReload.reason, updateId: pending };
    }
    // Re-check running id immediately before reload (it may have changed).
    try {
      liveRunning = this.safeRunningId();
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (liveRunning && pending === liveRunning) {
      this.pendingUpdateId = null;
      this.pendingSource = null;
      this.pendingStagedAtSeq = null;
      return { status: 'already-running', updateId: pending };
    }
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
// Hook (mount above guards; DI for tests — LIVE getters via refs)
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
 * Mount at the runtime root above guards. Observes `useUpdates()` once on
 * launch (no duplicate JS check) and observes later native downloads without
 * repeated checks or resetting staged state. Never auto-clears the loop
 * guard on mount — T10 must call `markSuccessfulLaunch(runningId)` after the
 * hydrated stable app milestone. Unknown safety fails closed.
 *
 * Background tracking keeps the FIRST departure from active until the next
 * active (background→inactive does not overwrite), so an iOS
 * inactive-after-6h event cannot reset the duration to zero.
 */
export function useOtaCoordinator(options?: OtaCoordinatorHookOptions): OtaCoordinator {
  // Stable coordinator instance for the hook lifetime (initialized once).
  // useState initializer runs once and never reads refs during render.
  const [coordinator] = useState<OtaCoordinator>(() =>
    options?.coordinator ??
    createOtaCoordinator({
      updates: createExpoUpdatesClient(),
      storage: createAsyncStorageOtaStorage(),
      now: options?.now,
      report: options?.report,
    }),
  );
  const observed = Updates.useUpdates();
  // Keep latest DI via refs so async work always reads fresh values (no stale capture).
  // Updated in an effect (not during render) to satisfy react-hooks/refs.
  const getSafetyRef = useRef(options?.getSafety);
  const getEnvelopeRef = useRef(options?.getEnvelope);
  const nowRef = useRef(options?.now ?? (() => Date.now()));
  const backgroundedAtRef = useRef<number | null>(null);
  const startupDoneRef = useRef(false);
  const lastDownloadedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    getSafetyRef.current = options?.getSafety;
    getEnvelopeRef.current = options?.getEnvelope;
    nowRef.current = options?.now ?? (() => Date.now());
  });

  const runningId =
    (observed?.currentlyRunning?.updateId as string | undefined) ?? null;
  const downloaded = observed?.downloadedUpdate as unknown as
    | { updateId?: unknown }
    | undefined;
  const downloadedId = typeof downloaded?.updateId === 'string' ? (downloaded.updateId as string) : null;

  useEffect(() => {
    if (startupDoneRef.current) return;
    startupDoneRef.current = true;
    coordinator.observeStartup({ currentlyRunningUpdateId: runningId, downloadedUpdateId: downloadedId });
    // Intentionally NO markSuccessfulLaunch here. T10 calls
    // `markSuccessfulLaunch(runningId)` after hydrated stable app.
  }, [coordinator, runningId, downloadedId]);

  useEffect(() => {
    // Observe later native downloads without a repeated startup check and
    // without resetting unrelated staged state. Same-id re-emits preserve
    // authority timing (the coordinator ignores them).
    if (lastDownloadedRef.current === undefined) {
      lastDownloadedRef.current = downloadedId;
      // First emission was already handled by observeStartup above; still
      // route through observeDownloadedUpdate for uniform generation handling
      // only when it differs (it does not on mount, so this is a no-op).
      if (downloadedId !== null) {
        coordinator.observeDownloadedUpdate(downloadedId, runningId);
      }
      return;
    }
    if (downloadedId !== lastDownloadedRef.current) {
      lastDownloadedRef.current = downloadedId;
      coordinator.observeDownloadedUpdate(downloadedId, runningId);
    }
  }, [coordinator, downloadedId, runningId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        // First departure only: background→inactive must not overwrite.
        if (backgroundedAtRef.current == null) {
          try {
            backgroundedAtRef.current = nowRef.current();
          } catch {
            // Leave as null (unknown) when the clock throws and no value exists.
          }
        }
        return;
      }
      if (state === 'active') {
        const backgroundedAtMs = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        // LIVE getters: read latest DI via refs + real AppState.currentState
        // to reject a stale foreground that has since backgrounded.
        const liveGetSafety: OtaSafetyGetter = () => {
          let base: OtaSafetyInput;
          try {
            const fn = getSafetyRef.current;
            base = fn ? fn() : OTA_UNKNOWN_SAFETY;
          } catch {
            throw new Error('ota safety unavailable (getter threw)');
          }
          let liveForeground: boolean | null;
          try {
            liveForeground = AppState.currentState === 'active';
          } catch {
            return { ...base, isForeground: null };
          }
          return { ...base, isForeground: liveForeground };
        };
        const liveGetEnvelope: OtaEnvelopeGetter = () => {
          try {
            const fn = getEnvelopeRef.current;
            return fn ? fn() : null;
          } catch {
            throw new Error('ota envelope unavailable (getter threw)');
          }
        };
        let nowMs: number;
        try {
          nowMs = nowRef.current();
        } catch {
          return;
        }
        void coordinator.onForeground({ nowMs, backgroundedAtMs, getSafety: liveGetSafety, getEnvelope: liveGetEnvelope });
      }
    });
    return () => subscription.remove();
  }, [coordinator]);

  return coordinator;
}

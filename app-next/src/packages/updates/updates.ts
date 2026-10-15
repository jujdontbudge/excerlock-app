import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const OTA_FOREGROUND_STALE_MS = 6 * 60 * 60 * 1000;
export const OTA_CHECK_BUDGET_MS = 15_000;
export const OTA_FETCH_BUDGET_MS = 60_000;
export const OTA_MAX_RELOAD_ATTEMPTS = 2;
export const OTA_APPLY_ON_COLD_START_ONLY = true;

const OTA_GUARD_KEY = 'excerlock-next.ota-guard.v1';
const OTA_ENVELOPE_KEY = 'excerlock-next.ota-envelope.v1';
const OTA_LAST_CHECK_KEY = 'excerlock-next.ota-last-check.v1';


export type OtaSafetyInput = {
  purchaseOrRestoreBusy: boolean | null | undefined;
  permissionPromptPending: boolean | null | undefined;
  cameraActive: boolean | null | undefined;
  walkingActive: boolean | null | undefined;
  proppedActive: boolean | null | undefined;
  isForeground: boolean | null | undefined;
  route: string | null | undefined;
};

export type OtaSafetyGetter = () => OtaSafetyInput;

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
  clearEnvelope(): Promise<void>;
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


const OTA_SAFE_ROUTE_SET = new Set<string>([
  '/home',
  '/conditions',
  '/analytics',
  '/settings',
]);

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

export function isOtaSafeRoute(route: string | null | undefined): boolean {
  const normalized = normalizeOtaRoute(route);
  if (!normalized) return false;
  return OTA_SAFE_ROUTE_SET.has(normalized);
}

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
    async clearEnvelope() {
      envelope = null;
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
        throw new OtaStorageError(`OTA guard read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (raw == null || raw === '') return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new OtaCorruptGuardError('OTA guard JSON is corrupt; refusing to reset retry authority');
      }
      const v = parsed as Partial<OtaPersistedGuard> | null;
      if (!v || typeof v.updateId !== 'string' || !v.updateId || !Number.isFinite(v.launchCount as number)) {
        throw new OtaCorruptGuardError('OTA guard shape is invalid; refusing to reset retry authority');
      }
      return { updateId: v.updateId, launchCount: Math.max(0, Math.floor(v.launchCount as number)) };
    },
    async saveGuard(guard) {
      await AsyncStorage.setItem(OTA_GUARD_KEY, JSON.stringify(guard));
    },
    async clearGuard() {
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
      await AsyncStorage.setItem(OTA_ENVELOPE_KEY, JSON.stringify(envelope));
    },
    async clearEnvelope() {
      await AsyncStorage.removeItem(OTA_ENVELOPE_KEY);
    },
    async loadLastCheckAtMs() {
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
      try {
        await AsyncStorage.setItem(OTA_LAST_CHECK_KEY, JSON.stringify(ms));
      } catch {
      }
    },
  };
}


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


export type OtaObservabilityContext = {
  update_id: string | null;
  runtime_version: string | null;
  channel: string | null;
  is_embedded: boolean | null;
};

export function embeddedRuntimeVersion(): string | null {
  try {
    return Updates.runtimeVersion ?? null;
  } catch {
    return null;
  }
}

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


export type OtaForegroundArgs = {
  nowMs: number;
  backgroundedAtMs: number | null | undefined;
  getSafety: OtaSafetyGetter;
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
  private guardTail: Promise<void> = Promise.resolve();

  constructor(deps: OtaCoordinatorDeps) {
    this.updates = deps.updates;
    this.storage = deps.storage;
    this.nowFn = deps.now ?? (() => Date.now());
    this.report = deps.report;
    this.checkBudgetMs = deps.checkBudgetMs ?? OTA_CHECK_BUDGET_MS;
    this.fetchBudgetMs = deps.fetchBudgetMs ?? OTA_FETCH_BUDGET_MS;
  }

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
    if (this.pendingUpdateId && this.pendingUpdateId !== downloaded) return;
    this.pendingUpdateId = downloaded;
    this.pendingSource = 'startup';
    this.pendingStagedAtSeq = this.foregroundSeq;
  }

  observeDownloadedUpdate(
    downloadedUpdateId: string | null | undefined,
    currentlyRunningUpdateId?: string | null | undefined,
  ): void {
    const downloaded = typeof downloadedUpdateId === 'string' && downloadedUpdateId ? downloadedUpdateId : null;
    const runningArg = typeof currentlyRunningUpdateId === 'string' ? currentlyRunningUpdateId : null;
    if (downloaded) this.lastDownloadedId = downloaded;
    if (runningArg) this.lastRunningId = runningArg;
    if (!downloaded) return;
    const liveRunning = runningArg ?? this.safeRunningIdOrNull();
    if (liveRunning && downloaded === liveRunning) {
      if (this.pendingUpdateId === downloaded) {
        this.pendingUpdateId = null;
        this.pendingSource = null;
        this.pendingStagedAtSeq = null;
      }
      return;
    }
    if (this.pendingUpdateId && this.pendingUpdateId !== downloaded) this.epoch += 1;
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

  async markSuccessfulLaunch(runningUpdateId: string | null | undefined): Promise<void> {
    if (typeof runningUpdateId !== 'string' || !runningUpdateId) return;
    await this.withGuardLock(async () => {
      if (this.safeRunningId() !== runningUpdateId) return;
      const guard = await this.storage.loadGuard();
      if (this.safeRunningId() === runningUpdateId && guard?.updateId === runningUpdateId) {
        await this.storage.clearGuard();
      }
    });
  }

  private async withGuardLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.guardTail;
    let release!: () => void;
    this.guardTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await work(); }
    finally { release(); }
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
      return await Promise.race([guarded, timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private async saveLastCheckBestEffort(ms: number): Promise<void> {
    try {
      await this.storage.saveLastCheckAtMs(ms);
    } catch {
    }
  }

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
    this.busy = true;
    this.foregroundSeq += 1;
    const currentSeq = this.foregroundSeq;
    const nowMs = args.nowMs;
    const backgroundDurationMs = nowMs - (args.backgroundedAtMs as number);
    let lastCheckAtMs: number | null = null;
    try {
      lastCheckAtMs = await this.storage.loadLastCheckAtMs();
    } catch {
      lastCheckAtMs = null;
    }
    const sinceLastCheckMs = lastCheckAtMs == null ? null : nowMs - lastCheckAtMs;

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
    let check: { isAvailable: boolean; updateId: string | null };
    const checkPromise = this.updates.checkForUpdate();
    try {
      check = await this.withBudget(checkPromise, this.checkBudgetMs, epochAtStart);
    } catch (error) {
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

  private reloadIfSafeInternal(
    getSafety: OtaSafetyGetter,
    getEnvelope: OtaEnvelopeGetter | null,
    nowMs: number,
    epochAtStart: number,
    currentSeq: number,
  ): Promise<OtaReloadResult> {
    return this.withGuardLock(() => this.reloadWithGuard(getSafety, getEnvelope, nowMs, epochAtStart, currentSeq));
  }

  private async reloadWithGuard(
    getSafety: OtaSafetyGetter,
    getEnvelope: OtaEnvelopeGetter | null,
    nowMs: number,
    epochAtStart: number,
    currentSeq: number,
  ): Promise<OtaReloadResult> {
    const pending = this.pendingUpdateId;
    if (!pending) return { status: 'no-pending' };
    if (OTA_APPLY_ON_COLD_START_ONLY) return { status: 'deferred-unsafe', reason: 'cold-start-only', updateId: pending };
    if (this.pendingSource === 'observation' &&
        (this.pendingStagedAtSeq == null || this.pendingStagedAtSeq >= currentSeq)) {
      return { status: 'deferred-unsafe', reason: 'needs-fresh-foreground', updateId: pending };
    }
    let guard: OtaPersistedGuard | null;
    try { guard = await this.storage.loadGuard(); }
    catch {
      this.emitReport('ota.guard-read-failed', { updateId: pending });
      return { status: 'failed', error: 'guard storage unavailable or corrupt' };
    }
    if (guard?.updateId === pending && guard.launchCount >= OTA_MAX_RELOAD_ATTEMPTS) {
      this.emitReport('ota.loop-guard-blocked', { updateId: pending, launchCount: guard.launchCount });
      return { status: 'blocked-loop-guard', updateId: pending };
    }
    const candidateCheck = (): OtaReloadResult | null => {
      if (this.epoch !== epochAtStart || this.pendingUpdateId !== pending) {
        return { status: 'deferred-unsafe', reason: 'candidate-superseded', updateId: pending };
      }
      try {
        if (this.safeRunningId() === pending) {
          this.pendingUpdateId = null; this.pendingSource = null; this.pendingStagedAtSeq = null;
          return { status: 'already-running', updateId: pending };
        }
      } catch { return { status: 'failed', error: 'running update unavailable' }; }
      return null;
    };
    const readSnapshot = () => {
      const safety = this.readLiveSafety(getSafety);
      let supplied: ReturnType<OtaEnvelopeGetter>;
      try { supplied = this.readLiveEnvelope(getEnvelope); }
      catch { return { error: 'resume envelope unavailable' }; }
      const envelope = supplied ?? { route: safety.route ?? '', draftIds: [] };
      const safe = evaluateSafeBoundary(safety);
      if (!safe.safe) return { reason: safe.reason };
      if (normalizeOtaRoute(envelope.route) !== normalizeOtaRoute(safety.route) ||
          !Array.isArray(envelope.draftIds) || envelope.draftIds.some((id) => typeof id !== 'string')) {
        return { reason: 'incoherent-resume-envelope' };
      }
      return { envelope: { route: envelope.route, draftIds: [...envelope.draftIds] } };
    };
    const initialCandidate = candidateCheck();
    if (initialCandidate) return initialCandidate;
    let snapshot: ReturnType<typeof readSnapshot>;
    try { snapshot = readSnapshot(); }
    catch { return { status: 'deferred-unsafe', reason: 'safety-or-envelope-unavailable', updateId: pending }; }
    if (snapshot.error) return { status: 'failed', error: snapshot.error };
    if (!snapshot.envelope) return { status: 'deferred-unsafe', reason: snapshot.reason!, updateId: pending };
    const envelope = snapshot.envelope;
    const signature = JSON.stringify(envelope);
    const revalidate = (): OtaReloadResult | null => {
      const candidate = candidateCheck();
      if (candidate) return candidate;
      try {
        const fresh = readSnapshot();
        if (fresh.error) return { status: 'failed', error: fresh.error };
        if (!fresh.envelope) return { status: 'deferred-unsafe', reason: fresh.reason!, updateId: pending };
        if (JSON.stringify(fresh.envelope) !== signature) {
          return { status: 'deferred-unsafe', reason: 'resume-envelope-changed', updateId: pending };
        }
      } catch { return { status: 'deferred-unsafe', reason: 'safety-or-envelope-unavailable', updateId: pending }; }
      return null;
    };
    try { await this.storage.saveEnvelope({ ...envelope, savedAtMs: nowMs }); }
    catch {
      this.emitReport('ota.envelope-write-failed', { updateId: pending });
      return { status: 'failed', error: 'resume envelope persistence failed' };
    }
    const afterEnvelope = revalidate();
    if (afterEnvelope) return afterEnvelope;
    const nextCount = guard?.updateId === pending ? guard.launchCount + 1 : 1;
    try { await this.storage.saveGuard({ updateId: pending, launchCount: nextCount }); }
    catch {
      this.emitReport('ota.guard-write-failed', { updateId: pending });
      return { status: 'failed', error: 'guard persistence failed' };
    }
    const beforeReload = revalidate();
    if (beforeReload) {
      try {
        if (guard) await this.storage.saveGuard(guard);
        else await this.storage.clearGuard();
      } catch {
        this.emitReport('ota.guard-rollback-failed', { updateId: pending });
        return { status: 'failed', error: 'aborted reload guard rollback failed' };
      }
      return beforeReload;
    }
    await this.updates.reload();
    return { status: 'reloaded', updateId: pending };
  }

}

export function createOtaCoordinator(deps: OtaCoordinatorDeps): OtaCoordinator {
  return new OtaCoordinator(deps);
}


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

export function useOtaCoordinator(options?: OtaCoordinatorHookOptions): OtaCoordinator {
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
  }, [coordinator, runningId, downloadedId]);

  useEffect(() => {
    if (lastDownloadedRef.current === undefined) {
      lastDownloadedRef.current = downloadedId;
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
        if (backgroundedAtRef.current == null) {
          try {
            backgroundedAtRef.current = nowRef.current();
          } catch {
          }
        }
        return;
      }
      if (state === 'active') {
        const backgroundedAtMs = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
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

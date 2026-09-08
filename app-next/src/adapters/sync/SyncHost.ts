import { dayKey } from '../../domain/calendar';
import { Unsubscribe } from '../../ports/models';
import { Runtime } from '../../runtime/Runtime';
import { profileStore } from '../../state/profileStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { sessionStore } from '../../state/sessionStore';
import { DeviceFacts, hasDayFacts, markAllDirty, pruneTombstones, trackChanges } from './changeTracker';
import { HistoryBridge, restoreFromServer } from './restore';
import { SyncError } from './SyncClient';
import { syncLog } from './syncLog';
import { initialSyncState, syncStore, SyncState } from './syncStore';

/** The runtime owner passes the app-state source in; this module never subscribes to `AppState` itself. */
export type AppStateSource = {
  addEventListener(event: 'change', callback: (state: string) => void): { remove(): void };
};

export type SyncHostOptions = {
  appState?: AppStateSource;
  history?: HistoryBridge;
  /** Called once when the server rejects the session; sync stays paused until the session changes. */
  onAuthRequired?: () => void;
  debounceMs?: number;
  dayFactsIntervalMs?: number;
};

export type SyncHandle = {
  /** Resolves once the outbox is hydrated and the host is observing the stores. */
  ready: Promise<void>;
  /** Pushes now; `force` also sends day facts ahead of their cadence (the background transition). */
  flush(force?: boolean): Promise<void>;
  stop(): void;
};

export const DEBOUNCE_MS = 5_000;
export const DAY_FACTS_INTERVAL_MS = 15 * 60_000;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 15 * 60_000;

type SyncRuntime = Pick<Runtime, 'sync' | 'reachability' | 'clock' | 'gym'>;

/**
 * Backs the device up to the server (D5). Rules and the profile push five seconds after their last change;
 * day facts push on app background and at most every fifteen minutes while foregrounded; an identity
 * change restores first, then pushes everything. Offline work queues in `syncStore`; failures back off and
 * are visible only in the developer log. Nothing here ever blocks the UI or feeds enforcement.
 */
export function startSync(runtime: SyncRuntime, options: SyncHostOptions = {}): SyncHandle {
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS;
  const dayFactsIntervalMs = options.dayFactsIntervalMs ?? DAY_FACTS_INTERVAL_MS;
  let active = true,
    busy = false,
    again = false,
    forceAgain = false,
    applying = false,
    attempts = 0,
    retryAt: number | null = null,
    timerStop: Unsubscribe | undefined,
    previous: DeviceFacts | undefined;
  const stops: Unsubscribe[] = [];
  const data = () => syncStore.getState().data;
  const patch = (value: Partial<SyncState>) => syncStore.getState().patch(value);
  const now = () => runtime.clock.now();
  const log = (level: 'info' | 'warn' | 'error', message: string) => syncLog.getState().log(level, message, now());
  const facts = (): DeviceFacts => ({
    rules: rulesStore.getState().data.rules,
    ruleDays: ruleDaysStore.getState().data.days,
    earnedUnlocks: ruleDaysStore.getState().data.earnedUnlocks,
    history: options.history?.get() ?? [],
    profile: profileStore.getState().data,
  });

  const observe = () => {
    if (!active || applying || !previous) return;
    const next = facts();
    patch(trackChanges(data(), previous, next, now()));
    previous = next;
    schedule();
  };

  const identityOf = () => {
    const session = sessionStore.getState().data.session;
    return `${session.kind}:${session.userId}`;
  };
  const checkIdentity = () => {
    if (!active) return;
    const identity = identityOf();
    if (identity === data().identity) return;
    // Keep the change clocks and this device's deletions: they describe local rows, whoever signs in.
    const { tombstones, clocks, deleted } = data();
    patch({ ...initialSyncState(), identity, tombstones, clocks, deleted });
    syncLog.getState().setAuthRequired(false);
    attempts = 0;
    retryAt = null;
    schedule();
  };

  const schedule = () => {
    timerStop?.();
    timerStop = undefined;
    if (!active || busy || syncLog.getState().authRequired) return;
    const state = data();
    const nowMs = Date.parse(now());
    const candidates: number[] = [];
    if (retryAt !== null) candidates.push(Math.max(retryAt, nowMs));
    else {
      if (!state.restored) candidates.push(nowMs);
      if (state.rulesDirty || state.profileDirty)
        candidates.push(Math.max(nowMs, Date.parse(state.rulesChangedAt ?? state.profileUpdatedAt ?? now()) + debounceMs));
      if (hasDayFacts(state))
        candidates.push(
          state.lastDayFactsPushAt ? Math.max(nowMs, Date.parse(state.lastDayFactsPushAt) + dayFactsIntervalMs) : nowMs + debounceMs,
        );
    }
    if (!candidates.length) return;
    timerStop = runtime.clock.at(new Date(Math.min(...candidates)).toISOString(), () => void flush(false));
  };

  const dayFactsDue = (state: SyncState, force: boolean) =>
    hasDayFacts(state) &&
    (force || !state.lastDayFactsPushAt || Date.parse(now()) - Date.parse(state.lastDayFactsPushAt) >= dayFactsIntervalMs);

  /** Runs one push; a client rejection drops that batch and lets the next step run. Auth and retryable errors propagate. */
  const step = async (name: string, run: () => Promise<void>, settle: () => void, drop: () => void) => {
    try {
      await run();
      settle();
    } catch (error) {
      if (error instanceof SyncError && error.kind === 'client') {
        log('error', `${name}: rejected by the server (${error.status}); batch dropped`);
        drop();
        return;
      }
      throw error;
    }
  };

  const restore = async () => {
    applying = true;
    let outcome;
    try {
      outcome = await restoreFromServer({
        sync: runtime.sync,
        today: dayKey(now(), runtime.clock.timezone()),
        gymPlaces: runtime.gym.listPlaces(),
        history: options.history ?? null,
      });
    } finally {
      applying = false;
      previous = facts();
    }
    syncLog.getState().restored({ at: now(), ...outcome });
    const { summary } = outcome;
    log('info', `restored ${summary.rules} rules, ${summary.ruleDays} rule days, ${summary.history} history days`);
    patch(markAllDirty(data(), previous, now()));
  };

  const pushAll = async (force: boolean) => {
    let state = data();
    if (!state.restored) {
      await restore();
      state = data();
    }
    const rulesStamp = state.rulesChangedAt;
    if (state.rulesDirty) {
      const deleted = state.deleted;
      await step(
        'rules',
        () => runtime.sync.pushRules(rulesStore.getState().data.rules, deleted),
        () => {
          const current = data();
          const sent = new Set(deleted.map((entry) => entry.rule.id));
          patch({
            rulesDirty: current.rulesChangedAt !== rulesStamp,
            deleted: current.deleted.filter((entry) => !sent.has(entry.rule.id)),
          });
        },
        () => patch({ rulesDirty: false, deleted: [] }),
      );
    }
    const profileStamp = state.profileUpdatedAt;
    if (state.profileDirty && profileStamp)
      await step(
        'profile',
        () => runtime.sync.pushProfile({ ...profileStore.getState().data, updatedAt: profileStamp }),
        () => patch({ profileDirty: data().profileUpdatedAt !== profileStamp }),
        () => patch({ profileDirty: false }),
      );
    if (!dayFactsDue(state, force)) return;
    const kinds = ['ruleDays', 'usageDays', 'earnedUnlocks', 'history'] as const;
    for (const kind of kinds) {
      const rows = Object.values(state[kind]);
      if (!rows.length) continue;
      const sent = new Map(Object.entries(state[kind]).map(([key, row]) => [key, row.updatedAt]));
      const remaining = () =>
        Object.fromEntries(Object.entries(data()[kind]).filter(([key, row]) => sent.get(key) !== row.updatedAt));
      await step(
        kind,
        () => {
          switch (kind) {
            case 'ruleDays':
              return runtime.sync.pushRuleDays(Object.values(state.ruleDays));
            case 'usageDays':
              return runtime.sync.pushUsageDays(Object.values(state.usageDays));
            case 'earnedUnlocks':
              return runtime.sync.pushEarnedUnlocks(Object.values(state.earnedUnlocks));
            case 'history':
              return runtime.sync.pushHistory(Object.values(state.history));
          }
        },
        () => patch({ [kind]: remaining() } as Partial<SyncState>),
        () => patch({ [kind]: remaining() } as Partial<SyncState>),
      );
    }
    patch(pruneTombstones({ ...data(), lastDayFactsPushAt: now() }, dayKey(now(), runtime.clock.timezone())));
  };

  const flush = async (force = false) => {
    if (!active) return;
    if (busy) {
      again = true;
      forceAgain = forceAgain || force;
      return;
    }
    busy = true;
    timerStop?.();
    timerStop = undefined;
    try {
      if (syncLog.getState().authRequired) return;
      if (!(await runtime.reachability.isOnline())) {
        retryAt = Date.parse(now()) + BACKOFF_BASE_MS;
        log('info', 'offline; changes queued');
        return;
      }
      await pushAll(force);
      attempts = 0;
      retryAt = null;
      syncLog.getState().pushed(now());
    } catch (error) {
      const failure = error instanceof SyncError ? error : new SyncError('network', String(error));
      if (failure.kind === 'auth') {
        syncLog.getState().setAuthRequired(true);
        log('error', 'session rejected; sync paused until sign-in');
        options.onAuthRequired?.();
      } else {
        attempts += 1;
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_MAX_MS);
        retryAt = Date.parse(now()) + delay;
        log('warn', `${failure.message}; retry ${attempts} in ${Math.round(delay / 1000)}s`);
      }
    } finally {
      busy = false;
      if (again) {
        const force = forceAgain;
        again = false;
        forceAgain = false;
        void flush(force);
      } else schedule();
    }
  };

  const ready = Promise.resolve(syncStore.persist.rehydrate()).then(() => {
    if (!active) return;
    previous = facts();
    stops.push(
      rulesStore.subscribe(observe),
      ruleDaysStore.subscribe(observe),
      profileStore.subscribe(observe),
      sessionStore.subscribe(checkIdentity),
    );
    if (options.history) stops.push(options.history.subscribe(observe));
    if (options.appState) {
      const listener = options.appState.addEventListener('change', (state) => {
        if (state === 'background' || state === 'inactive') void flush(true);
      });
      stops.push(() => listener.remove());
    }
    checkIdentity();
    schedule();
  });

  return {
    ready,
    flush: async (force = false) => {
      await ready;
      await flush(force);
    },
    stop: () => {
      active = false;
      timerStop?.();
      stops.splice(0).forEach((stop) => stop());
    },
  };
}

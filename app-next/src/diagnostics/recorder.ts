import { syncLog } from '../adapters/sync/syncLog';
import { tapAnalytics } from '../adapters/analytics/tapAnalytics';
import { AnalyticsPort } from '../ports/AnalyticsPort';
import { Permissions } from '../domain/types';
import { AppStateSource, appStateOwner } from '../runtime/appState';
import { Runtime } from '../runtime/Runtime';
import { permissionsStore } from '../state/permissionsStore';
import { sessionStore } from '../state/sessionStore';
import { DiagnosticsLog } from './DiagnosticsLog';

/** What the log is told about an event that is not a store change. */
export type DiagnosticsRecorder = (event: string, data?: Record<string, unknown>) => void;

export type DiagnosticsHandle = { record: DiagnosticsRecorder; stop(): void };

export type BuildFacts = { build: string; iosVersion: string; device: string };

export type DiagnosticsOptions = {
  log: DiagnosticsLog;
  appState?: AppStateSource;
  build?: BuildFacts;
  /** Copies what the Screen Time extensions recorded; called on every foreground. */
  drainExtensions?: () => void;
};

const UNKNOWN_BUILD: BuildFacts = { build: 'unknown', iosVersion: 'unknown', device: 'unknown' };

/**
 * Binds the diagnostics log to the app.
 *
 * The device runbook is run away from a Mac, with the app deliberately backgrounded, force-quit and
 * rebooted, so `console.log` proves nothing and this file is the evidence. It records only what the
 * composition owns; every adapter appends its own events, and `docs/verification/diagnostics-events.md`
 * is the contract both sides are written against.
 *
 * The privacy floor is enforced at the point of writing, not by convention: an analytics event is
 * recorded by name with no properties, and a session by user id with no email and no token.
 */
export function startDiagnostics(runtime: Runtime, options: DiagnosticsOptions): DiagnosticsHandle {
  const { log } = options;
  let active = true;
  const record: DiagnosticsRecorder = (event, data = {}) => {
    if (active) log.append(event, data);
  };

  record('app.launch', { ...(options.build ?? UNKNOWN_BUILD), runtime: runtime.kind });

  const appState = (options.appState ?? appStateOwner()).addEventListener('change', (state) => {
    if (!active) return;
    record('app.state', { state });
    // The extensions cannot write this log, so their buffer is copied out whenever the app is in a
    // position to read it.
    if (state === 'active') options.drainExtensions?.();
  });

  let permissions = permissionsStore.getState().data;
  const stopPermissions = permissionsStore.subscribe(() => {
    const next = permissionsStore.getState().data;
    for (const name of Object.keys(next) as (keyof Permissions)[]) {
      if (permissions[name] === next[name]) continue;
      record('permission.status', { name, status: next[name] });
    }
    permissions = next;
  });

  let session = sessionStore.getState().data.session;
  const publishSession = () => {
    const { kind, userId } = session;
    record('auth.session', {
      kind,
      ...(session.kind === 'signedIn' ? { provider: session.provider } : {}),
      userId,
    });
  };
  publishSession();
  const stopSession = sessionStore.subscribe(() => {
    const next = sessionStore.getState().data.session;
    if (next.userId === session.userId && next.kind === session.kind) return;
    session = next;
    publishSession();
  });

  let lastRestore = syncLog.getState().lastRestore;
  const stopSync = syncLog.subscribe(() => {
    const next = syncLog.getState().lastRestore;
    if (next === lastRestore) return;
    lastRestore = next;
    if (!next) return;
    const { rules, ruleDays, history, earnedUnlocks } = next.summary;
    record('sync.pull', { rules, ruleDays, history, earnedUnlocks });
  });

  const analytics = runtime.analytics;
  runtime.analytics = recordNames(analytics, record);

  return {
    record,
    stop: () => {
      active = false;
      runtime.analytics = analytics;
      stopSync();
      stopSession();
      stopPermissions();
      appState.remove();
    },
  };
}

/**
 * Names only. An analytics event's properties can carry a rule name or a gym, and the privacy floor
 * for this log forbids both — knowing that an event fired is what the runbook needs.
 */
function recordNames(analytics: AnalyticsPort, record: DiagnosticsRecorder): AnalyticsPort {
  return tapAnalytics(analytics, (kind, name) => {
    if (kind === 'track') record('analytics.event', { name });
    if (kind === 'screen') record('analytics.event', { name: `screen:${name}` });
  });
}

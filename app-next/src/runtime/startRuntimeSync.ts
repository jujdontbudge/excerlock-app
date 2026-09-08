import { bridgeHistoryStore } from '../adapters/sync/restore';
import { startSync } from '../adapters/sync/SyncHost';
import { Unsubscribe } from '../ports/models';
import { historyStore } from '../state/historyStore';
import { AppStateSource, appStateOwner } from './appState';
import { Runtime } from './Runtime';

/**
 * Backs the device up to the VPS, on the schedule `adapters/sync/README.md` documents.
 *
 * Three things only the composition root can supply. The app-state source, because the sync host is
 * never allowed to reach for `AppState` itself; the history bridge, without which history and usage
 * days are neither pushed nor restored; and what to do when the server rejects the session, which is
 * to refresh it — sync stays paused until the identity changes, and a refreshed or freshly minted
 * anonymous session is what changes it.
 *
 * Only the real runtime is backed up. The demo runtime's `SyncPort` is an in-memory server whose
 * whole point is that nothing leaves the process, so running the schedule against it would spend
 * timers to move data from a store to itself.
 */
export function startRuntimeSync(
  runtime: Runtime,
  options: { appState?: AppStateSource } = {},
): Unsubscribe {
  if (runtime.kind !== 'real') return () => undefined;
  const host = startSync(runtime, {
    appState: options.appState ?? appStateOwner(),
    history: bridgeHistoryStore(historyStore),
    onAuthRequired: () => void runtime.onForeground?.(),
  });
  return () => host.stop();
}

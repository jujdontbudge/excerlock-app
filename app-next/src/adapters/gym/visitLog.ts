import { Unsubscribe } from '../../ports/models';
import { GymVisit } from '../../domain/types';
import { gymVisitsStore } from '../../state/gymVisitsStore';

/**
 * Where visits live. The adapter never accumulates dwell: it records the instants a region was
 * entered and left, and `domain/gymDwell` clips, merges and sums them at read time.
 */
export interface VisitLog {
  read(): GymVisit[];
  write(visits: GymVisit[]): void;
  subscribe(callback: (visits: GymVisit[]) => void): Unsubscribe;
}

/**
 * The persisted log, and the one production uses. Visits survive a relaunch because the locker-room
 * hour is credited from instants recorded before the app was killed (decision B31).
 */
export const visitLogFromStore = (): VisitLog => ({
  read: () => gymVisitsStore.getState().data.visits,
  write: (visits) => gymVisitsStore.getState().patch({ visits }),
  subscribe: (callback) => gymVisitsStore.subscribe((state) => callback(state.data.visits)),
});

/** The in-memory log a test drives directly; it persists nothing. */
export function memoryVisitLog(initial: GymVisit[] = []): VisitLog {
  let visits = initial;
  const listeners = new Set<(visits: GymVisit[]) => void>();
  return {
    read: () => visits,
    write: (next) => {
      visits = next;
      listeners.forEach((listener) => listener(visits));
    },
    subscribe: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

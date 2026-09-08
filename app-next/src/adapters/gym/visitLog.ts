import { Unsubscribe } from '../../ports/models';
import { GymVisit } from '../pending/types';

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
 * merge: P2-T15 persists visits in `state/gymVisitsStore` (`excerlock-next.gymVisits.v1`). When it
 * lands, replace this with:
 *
 *   export const visitLogFromStore = (): VisitLog => ({
 *     read: () => gymVisitsStore.getState().data.visits,
 *     write: (visits) => gymVisitsStore.getState().patch({ visits }),
 *     subscribe: (cb) => gymVisitsStore.subscribe((state) => cb(state.data.visits)),
 *   });
 *
 * The in-memory log below keeps the adapter testable and is the default until then.
 */
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

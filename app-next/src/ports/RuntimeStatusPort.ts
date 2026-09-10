import { HistoryDay, Unsubscribe } from './models';

/** Production-safe lifecycle/read-model state. It contains no simulation controls. */
export type RuntimeStatusSnapshot = {
  hydrated: boolean;
  loading: boolean;
  history: HistoryDay[];
};

export interface RuntimeStatusPort {
  ready(): Promise<void>;
  flush(): Promise<void>;
  snapshot(): RuntimeStatusSnapshot;
  subscribe(callback: () => void): Unsubscribe;
}

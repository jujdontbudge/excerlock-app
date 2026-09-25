import type { ScheduleIssue } from '../domain/scheduleWindowPlan';
import { HistoryDay, Unsubscribe } from './models';

export type RuntimeStatusSnapshot = {
  hydrated: boolean;
  loading: boolean;
  history: HistoryDay[];
  scheduleIssue?: ScheduleIssue;
};

export interface RuntimeStatusPort {
  ready(): Promise<void>;
  flush(): Promise<void>;
  snapshot(): RuntimeStatusSnapshot;
  subscribe(callback: () => void): Unsubscribe;
}

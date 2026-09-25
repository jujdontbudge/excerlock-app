import type { ScheduleIssue } from '../schedule/scheduleWindowPlan';
import { HistoryDay, Unsubscribe } from '../model/models';

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

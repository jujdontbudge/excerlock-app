import type { ScheduleIssue } from '../schedule/scheduleWindowPlan';
import { HistoryDay, Unsubscribe } from '../model/models';

export type RuntimeStatusSnapshot = {
  hydrated: boolean;
  loading: boolean;
  history: HistoryDay[];
  scheduleIssue?: ScheduleIssue;
  shieldLifts?: { earned: number; source: 'foreground' | 'background' | 'geofence' | 'manual' | null };
};

export interface RuntimeStatusPort {
  ready(): Promise<void>;
  flush(): Promise<void>;
  snapshot(): RuntimeStatusSnapshot;
  subscribe(callback: () => void): Unsubscribe;
}

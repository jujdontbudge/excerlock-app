import { Profile, Rule, RuleDay } from '../domain/types';

export type ExportVisit = {
  regionId: string;
  atMs: number;
  id?: string;
  type?: 'enter' | 'exit';
  receivedAtMs?: number;
};
export type ExportPayload = {
  exportedAt: string;
  rules: Rule[];
  days: RuleDay[];
  earnedUnlocks: Array<{ ruleId: string; day: string; earnedAt: string | null }>;
  visits: ExportVisit[];
  profile: Profile;
};

/** UI boundary. Native implementations serialize JSON and present the system share sheet. */
export interface ExportPort {
  /** The runtime captures account ownership before invoking this asynchronous builder. */
  requestShare(buildPayload: () => Promise<ExportPayload>): Promise<void>;
}

import { Profile, Rule, RuleDay } from '../model/types';

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

export interface ExportPort {
  requestShare(buildPayload: () => Promise<ExportPayload>): Promise<void>;
}

import { Rule, RuleDay } from '../model/types';
export interface SyncPort {
  pushRules(rules: Rule[]): Promise<void>;
  pushRuleDays(days: RuleDay[]): Promise<void>;
  pull(): Promise<{ rules: Rule[]; ruleDays: RuleDay[] }>;
}

import { ruleName } from './ruleName';
import { WindowInstance } from './schedule';
import { EarnedUnlock, Rule, RuleDay } from './types';

export function earnedUnlockForProgress(
  rule: Rule,
  before: RuleDay,
  after: RuleDay,
  instance: WindowInstance,
): EarnedUnlock | null {
  if (before.met || !after.met || !after.metAt) return null;
  return {
    day: after.day,
    ruleId: rule.id,
    ruleName: ruleName(rule),
    metAt: after.metAt,
    windowEnd: instance.end,
  };
}

export function upsertEarnedUnlock(records: EarnedUnlock[], unlock: EarnedUnlock): EarnedUnlock[] {
  return records.some((record) => record.day === unlock.day && record.ruleId === unlock.ruleId)
    ? records
    : [...records, unlock];
}

export function collectEarnedUnlocks(
  records: EarnedUnlock[],
  changes: { rule: Rule; before: RuleDay; after: RuleDay; instance: WindowInstance }[],
): EarnedUnlock[] {
  return changes.reduce((result, change) => {
    const unlock = earnedUnlockForProgress(change.rule, change.before, change.after, change.instance);
    return unlock ? upsertEarnedUnlock(result, unlock) : result;
  }, records);
}

import { LockDecision, Rule, RuleDay } from './types';
import { dayKey, windowInstances } from './schedule';

export type ConditionState =
  | 'met'
  | 'live'
  | 'blockingNow'
  | 'satisfiedToday'
  | 'inProgress'
  | 'paused'
  | 'pausedNoGym'
  | 'notScheduled'
  | 'permissionNeeded';

export function conditionState(
  rule: Rule,
  row: RuleDay,
  decision: LockDecision,
  now: string,
  timezone: string,
): ConditionState {
  if (!rule.enabled) return rule.pausedReason === 'noGym' ? 'pausedNoGym' : 'paused';
  if (rule.permissionNeeded) return 'permissionNeeded';
  if (row.met) return 'met';
  if (decision.state === 'unlockedMet' && decision.byRuleId !== rule.id) return 'satisfiedToday';
  if (decision.state === 'unlockedWalking' && decision.sessionRuleId === rule.id) return 'live';
  if (!windowInstances(rule, dayKey(now, timezone), timezone).length) return 'notScheduled';
  if (decision.state === 'locked' && decision.activeRuleIds.includes(rule.id)) return 'blockingNow';
  return 'inProgress';
}

import { LockDecision, Rule, RuleDay } from './types';
import { dayKey, windowInstances } from './schedule';
import { homeCopy } from '../content/home';

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

export type ConditionStatus = {
  text: string;
  /** active = still working, done = the day is covered, attention = the user must act, muted = inert today. */
  tone: 'active' | 'done' | 'attention' | 'muted';
};

const tones: Record<ConditionState, ConditionStatus['tone']> = {
  met: 'done',
  live: 'active',
  blockingNow: 'active',
  satisfiedToday: 'done',
  inProgress: 'active',
  paused: 'muted',
  pausedNoGym: 'muted',
  notScheduled: 'muted',
  permissionNeeded: 'attention',
};

/** The one status chip every condition list renders: Home's ConditionRow and P2-T20's RuleCard. */
export function conditionStatus(state: ConditionState): ConditionStatus {
  return { text: homeCopy.states[state], tone: tones[state] };
}

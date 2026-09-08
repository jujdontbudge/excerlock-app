import { Activity, Rule, RuleMode, Schedule, WalkPlace } from '../../domain/types';
import { RuleIssue, validateRule } from '../../domain/validateRule';
export type RuleDraft = {
  id: string;
  activity: Activity;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  place: WalkPlace;
  walkingMode: 'target' | 'state';
  stepGoal: number;
  gymMode: 'time' | 'arrival';
  gymMinutes: number;
  runMode: 'minutes' | 'distance';
  minutes: number;
  distance: number;
  unit: 'km' | 'mi';
};
export type DraftAction =
  | { type: 'setPlace'; value: WalkPlace }
  | { type: 'setWalkingMode'; value: 'target' | 'state' }
  | { type: 'setStepGoal' | 'setGymMinutes' | 'setMinutes'; value: number }
  | { type: 'setGymMode'; value: 'time' | 'arrival' }
  | { type: 'setRunMode'; value: 'minutes' | 'distance' }
  | { type: 'setDistance'; value: number; unit: 'km' | 'mi' };
export function createDraft(activity: Activity, unit: 'km' | 'mi' = 'mi', now = new Date().toISOString()): RuleDraft {
  return {
    id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    }),
    activity,
    createdAt: now,
    updatedAt: now,
    enabled: true,
    place: 'outside',
    walkingMode: 'target',
    stepGoal: 5000,
    gymMode: 'time',
    gymMinutes: 30,
    runMode: 'minutes',
    minutes: activity === 'running' ? 20 : 30,
    distance: activity === 'biking' ? (unit === 'mi' ? 5 : 8) : unit === 'mi' ? 2 : 3,
    unit,
  };
}
export function reduceDraft(d: RuleDraft, a: DraftAction): RuleDraft {
  switch (a.type) {
    case 'setPlace':
      return { ...d, place: a.value };
    case 'setWalkingMode':
      return { ...d, walkingMode: a.value };
    case 'setStepGoal':
      return { ...d, stepGoal: a.value };
    case 'setGymMode':
      return { ...d, gymMode: a.value };
    case 'setGymMinutes':
      return { ...d, gymMinutes: a.value };
    case 'setRunMode':
      return { ...d, runMode: a.value };
    case 'setMinutes':
      return { ...d, minutes: a.value };
    case 'setDistance':
      return { ...d, distance: a.value, unit: a.unit };
  }
}
function mode(d: RuleDraft): RuleMode {
  const activity = d.activity;
  if (activity === 'walking')
    return d.walkingMode === 'state'
      ? { kind: 'state', activity, place: d.place }
      : { kind: 'target', activity, place: d.place, metric: 'steps', goal: d.stepGoal };
  if (activity === 'gym')
    return d.gymMode === 'arrival'
      ? { kind: 'event', activity, trigger: 'arrival' }
      : { kind: 'target', activity, metric: 'minutes', goal: d.gymMinutes };
  return d.runMode === 'distance'
    ? { kind: 'target', activity, metric: 'distance', goal: d.distance, unit: d.unit }
    : { kind: 'target', activity, metric: 'minutes', goal: d.minutes };
}
export type RuleAttempt = { rule: Rule; issues?: undefined } | { rule?: undefined; issues: RuleIssue[] };
/** Builds a rule without throwing, so an unexpected draft renders a recoverable row instead of a blank screen. */
export function tryRule(d: RuleDraft, schedule: Schedule): RuleAttempt {
  const rule: Rule = {
    id: d.id,
    activity: d.activity,
    mode: mode(d),
    schedule,
    enabled: d.enabled,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  const issues = validateRule(rule);
  return issues.length ? { issues } : { rule };
}
export function toRuleOrThrow(d: RuleDraft, schedule: Schedule): Rule {
  const attempt = tryRule(d, schedule);
  if (attempt.issues) throw new Error(attempt.issues.join(', '));
  return attempt.rule;
}
/** @deprecated Call `toRuleOrThrow` when a throw is intended, `tryRule` when rendering. */
export const toRule = toRuleOrThrow;
export function fromRule(rule: Rule): RuleDraft {
  const m = rule.mode,
    d = createDraft(rule.activity, 'unit' in m ? m.unit : 'mi', rule.createdAt);
  Object.assign(d, { id: rule.id, updatedAt: rule.updatedAt, enabled: rule.enabled });
  if (m.activity === 'walking')
    Object.assign(d, { place: m.place, walkingMode: m.kind, ...(m.kind === 'target' ? { stepGoal: m.goal } : {}) });
  else if (m.activity === 'gym')
    Object.assign(d, {
      gymMode: m.kind === 'event' ? 'arrival' : 'time',
      ...(m.kind === 'target' ? { gymMinutes: m.goal } : {}),
    });
  else
    Object.assign(d, {
      runMode: m.metric,
      ...(m.metric === 'distance' ? { distance: m.goal, unit: m.unit } : { minutes: m.goal }),
    });
  return d;
}

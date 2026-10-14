import { Activity, Rule, RuleMode, Schedule } from '../model/types';
import { validateRule } from './validateRule';
export type RuleDraft = {
  id: string;
  activity: Activity;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  walkingMode: 'steps' | 'minutes' | 'state' | 'bank';
  difficulty: 'easy' | 'medium' | 'hard';
  stepGoal: number;
  walkMinutes: number;
  gymMode: 'time' | 'arrival' | 'presence' | 'bank';
  gymMinutes: number;
};
export type DraftAction =
  | { type: 'setWalkingMode'; value: 'steps' | 'minutes' | 'state' | 'bank' }
  | { type: 'setStepGoal' | 'setWalkMinutes' | 'setGymMinutes'; value: number }
  | { type: 'setGymMode'; value: 'time' | 'arrival' | 'presence' | 'bank' }
  | { type: 'setDifficulty'; value: RuleDraft['difficulty'] };
export function createDraft(activity: Activity, now = new Date().toISOString()): RuleDraft {
  return {
    id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    }),
    activity,
    createdAt: now,
    updatedAt: now,
    enabled: true,
    walkingMode: 'steps',
    difficulty: 'medium',
    stepGoal: 10000,
    walkMinutes: 20,
    gymMode: 'presence',
    gymMinutes: 30,
  };
}
export function reduceDraft(d: RuleDraft, a: DraftAction): RuleDraft {
  switch (a.type) {
    case 'setWalkingMode':
      return { ...d, walkingMode: a.value };
    case 'setStepGoal':
      return { ...d, stepGoal: a.value };
    case 'setWalkMinutes':
      return { ...d, walkMinutes: a.value };
    case 'setGymMode':
      return { ...d, gymMode: a.value };
    case 'setDifficulty':
      return { ...d, difficulty: a.value };
    case 'setGymMinutes':
      return { ...d, gymMinutes: a.value };
  }
}
export function isBankDraft(d: RuleDraft): boolean {
  return d.activity === 'walking' ? d.walkingMode === 'bank' : d.gymMode === 'bank';
}
export const bankSchedule: Schedule = { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'allDay' } };
function mode(d: RuleDraft): RuleMode {
  const activity = d.activity;
  if (isBankDraft(d)) return { kind: 'bank', activity, difficulty: d.difficulty };
  if (activity === 'walking')
    return d.walkingMode === 'state'
      ? { kind: 'state', activity }
      : { kind: 'target', activity, metric: d.walkingMode === 'minutes' ? 'minutes' : 'steps', goal: d.walkingMode === 'steps' ? d.stepGoal : d.walkMinutes };
  if (d.gymMode === 'arrival') return { kind: 'event', activity, trigger: 'arrival' };
  if (d.gymMode === 'presence') return { kind: 'state', activity };
  return { kind: 'target', activity, metric: 'minutes', goal: d.gymMinutes };
}
export function toRule(d: RuleDraft, schedule: Schedule): Rule {
  const rule: Rule = {
    id: d.id,
    activity: d.activity,
    mode: mode(d),
    schedule: isBankDraft(d) ? bankSchedule : schedule,
    enabled: d.enabled,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  const issues = validateRule(rule);
  if (issues.length) throw new Error(issues.join(', '));
  return rule;
}
export function fromRule(rule: Rule): RuleDraft {
  const m = rule.mode,
    d = createDraft(rule.activity, rule.createdAt);
  Object.assign(d, { id: rule.id, updatedAt: rule.updatedAt, enabled: rule.enabled });
  if (m.kind === 'bank') {
    Object.assign(d, { walkingMode: 'bank', gymMode: 'bank', difficulty: m.difficulty });
    return d;
  }
  if (m.activity === 'walking')
    Object.assign(d, m.kind === 'state' ? { walkingMode: 'state' } : {
      walkingMode: m.metric,
      ...(m.metric === 'steps' ? { stepGoal: m.goal } : { walkMinutes: m.goal }),
    });
  else
    Object.assign(d, {
      gymMode: m.kind === 'event' ? 'arrival' : m.kind === 'state' ? 'presence' : 'time',
      ...(m.kind === 'target' ? { gymMinutes: m.goal } : {}),
    });
  return d;
}

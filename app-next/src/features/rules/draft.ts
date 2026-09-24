import { Activity, Rule, RuleMode, Schedule } from '../../domain/types';
import { validateRule } from '../../domain/validateRule';
export type RuleDraft = {
  id: string;
  activity: Activity;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  walkingMode: 'steps' | 'minutes' | 'state';
  stepGoal: number;
  walkMinutes: number;
  gymMode: 'time' | 'arrival' | 'presence';
  gymMinutes: number;
};
export type DraftAction =
  | { type: 'setWalkingMode'; value: 'steps' | 'minutes' | 'state' }
  | { type: 'setStepGoal' | 'setWalkMinutes' | 'setGymMinutes'; value: number }
  | { type: 'setGymMode'; value: 'time' | 'arrival' | 'presence' };
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
    case 'setGymMinutes':
      return { ...d, gymMinutes: a.value };
  }
}
function mode(d: RuleDraft): RuleMode {
  const activity = d.activity;
  if (activity === 'walking')
    return d.walkingMode === 'state'
      ? { kind: 'state', activity }
      : { kind: 'target', activity, metric: d.walkingMode, goal: d.walkingMode === 'steps' ? d.stepGoal : d.walkMinutes };
  if (d.gymMode === 'arrival') return { kind: 'event', activity, trigger: 'arrival' };
  if (d.gymMode === 'presence') return { kind: 'state', activity };
  return { kind: 'target', activity, metric: 'minutes', goal: d.gymMinutes };
}
export function toRule(d: RuleDraft, schedule: Schedule): Rule {
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
  if (issues.length) throw new Error(issues.join(', '));
  return rule;
}
export function fromRule(rule: Rule): RuleDraft {
  const m = rule.mode,
    d = createDraft(rule.activity, rule.createdAt);
  Object.assign(d, { id: rule.id, updatedAt: rule.updatedAt, enabled: rule.enabled });
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

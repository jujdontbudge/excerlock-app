import { Activity, Profile } from '../../domain/types';
import { Answers } from '../../onboarding/types';
import { createDraft, RuleDraft, toRule } from './draft';
import { scheduleDraft, toSchedule } from './scheduleDraft';
import { rulesStore } from '../../state/rulesStore';
import { profileStore } from '../../state/profileStore';
import { onboardingStore } from '../../state/onboardingStore';
export function draftFromAnswers(a: Answers, unit: 'km' | 'mi', base?: RuleDraft): RuleDraft {
  const activity = (a.activity ?? 'walking') as Activity;
  const d = base?.activity === activity ? base : createDraft(activity, unit);
  return {
    ...d,
    id: String(a.ruleId ?? d.id),
    createdAt: String(a.ruleCreatedAt ?? d.createdAt),
    place: (a.walkPlace ?? 'outside') as RuleDraft['place'],
    walkingMode: a.walkingMode === 'state' ? 'state' : 'target',
    stepGoal: Number(a.stepGoal ?? 5000),
    gymMode: a.gymMode === 'arrival' ? 'arrival' : 'time',
    gymMinutes: Number(a.gymMinutes ?? 30),
    runMode: a[activity === 'biking' ? 'bikeMode' : 'runMode'] === 'distance' ? 'distance' : 'minutes',
    minutes: Number(a.minutes ?? d.minutes),
    distance: Number(a.distance ?? d.distance),
    unit: (a.unit ?? unit) as 'km' | 'mi',
  };
}
export function commitPlan(a: Answers, unit: 'km' | 'mi', base?: RuleDraft) {
  const draft = draftFromAnswers(a, unit, base),
    rule = toRule(draft, toSchedule(scheduleDraft(a)));
  const existing = rulesStore.getState().data.rules;
  rulesStore.getState().patch({ rules: [...existing.filter((r) => r.id !== rule.id), rule] });
  const profile: Partial<Profile> = { units: unit };
  for (const key of [
    'name',
    'referralSource',
    'ageBand',
    'occupation',
    'improveFirst',
    'mainReason',
    'estimatedDailyMinutes',
  ] as const) {
    if (a[key] !== undefined) Object.assign(profile, { [key]: key === 'name' ? String(a[key]).trim() : a[key] });
  }
  profileStore.getState().patch(profile);
  onboardingStore
    .getState()
    .patch({ answers: { ...a, ruleId: rule.id, ruleCreatedAt: rule.createdAt, ruleCommitted: true } });
  return rule;
}
export function goalStep(d: RuleDraft) {
  if (d.activity === 'walking') return d.walkingMode === 'state' ? 'W2' : 'W3';
  if (d.activity === 'gym') return d.gymMode === 'arrival' ? 'G1' : 'G2';
  return d.runMode === 'distance' ? 'D' : d.activity === 'running' ? 'R2' : 'B2';
}

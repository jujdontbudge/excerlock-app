import { draftFromAnswers } from './answersDraft';
import { Profile } from '../../domain/types';
import { Answers } from '../../onboarding/types';
import { RuleDraft, toRule } from './draft';
import { scheduleDraft, toSchedule } from './scheduleDraft';
import { rulesStore } from '../../state/rulesStore';
import { profileStore } from '../../state/profileStore';
import { onboardingStore } from '../../state/onboardingStore';
export { draftFromAnswers } from './answersDraft';
export function commitPlan(a: Answers, unit: 'km' | 'mi', base?: RuleDraft) {
  const draft = draftFromAnswers(a, base),
    rule = toRule(draft, toSchedule(scheduleDraft(a)));
  const existing = rulesStore.getState().data.rules;
  rulesStore.getState().patch({ rules: [...existing.filter((r) => r.id !== rule.id), rule] });
  const profile: Partial<Profile> = { units: unit };
  for (const key of [
    'name',
    'referralSource',
    'ageBand',
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
  return d.gymMode === 'arrival' ? 'G1' : 'G2';
}

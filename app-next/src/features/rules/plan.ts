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
  if (d.activity === 'walking') return d.walkingMode === 'state' ? 'W2' : d.walkingMode === 'minutes' ? 'W4' : 'W3';
  if (d.activity === 'gym') return d.gymMode === 'arrival' ? 'G1' : 'G2';
  return d.runMode === 'distance' ? 'D' : d.activity === 'running' ? 'R2' : 'B2';
}
/** The chooser an edit of the goal opens: the mode question, never the goal field. */
export function modeStep(d: RuleDraft) {
  if (d.activity === 'walking') return 'W2';
  if (d.activity === 'gym') return 'G1';
  return d.activity === 'running' ? 'R1' : 'B1';
}

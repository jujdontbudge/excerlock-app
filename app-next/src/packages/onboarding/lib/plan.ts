import { draftFromAnswers } from '../../conditions/answersDraft';
import { Profile } from '../../model/types';
import { Answers } from '../../model/answers';
import { RuleDraft, toRule } from '../../conditions/draft';
import { scheduleDraft, toSchedule } from '../../conditions/scheduleDraft';
import { rulesStore } from '../../conditions/rulesStore';
import { profileStore } from '../../preferences/profileStore';
import { onboardingStore } from '../onboardingStore';
import { assertScheduleRepresentable, type SchedulePlanContext } from '../../schedule/scheduleRepresentability';
export { draftFromAnswers } from '../../conditions/answersDraft';
export function commitPlan(a: Answers, unit: 'km' | 'mi', base?: RuleDraft, context?: SchedulePlanContext) {
  const draft = draftFromAnswers(a, base),
    rule = toRule(draft, toSchedule(scheduleDraft(a)));
  const existing = rulesStore.getState().data.rules;
  const proposed = [...existing.filter((r) => r.id !== rule.id), rule];
  assertScheduleRepresentable(proposed, context);
  rulesStore.getState().patch({ rules: proposed });
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
  return d.gymMode === 'time' ? 'G2' : 'G1';
}

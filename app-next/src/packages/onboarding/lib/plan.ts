import { draftFromAnswers } from '../../conditions/answersDraft';
import { Profile, Rule } from '../../model/types';
import { Answers } from '../../model/answers';
import { RuleDraft, toRule } from '../../conditions/draft';
import { scheduleDraft, toSchedule } from '../../conditions/scheduleDraft';
import { rulesStore } from '../../conditions/rulesStore';
import { profileStore } from '../../preferences/profileStore';
import { onboardingStore } from '../onboardingStore';
import { assertScheduleRepresentable, type SchedulePlanContext } from '../../schedule/scheduleRepresentability';
export { draftFromAnswers } from '../../conditions/answersDraft';
const proposedPlan = (a: Answers, base?: RuleDraft, extras = onboardingStore.getState().data.extraRules) => {
  const draft = draftFromAnswers(a, base),
    rule = toRule(draft, toSchedule(scheduleDraft(a))),
    staged = [rule, ...extras],
    existing = rulesStore.getState().data.rules;
  return { rule, rules: [...existing.filter((candidate) => !staged.some((item) => item.id === candidate.id)), ...staged] };
};
export function stageExtraRule(a: Answers, base: RuleDraft, extra: Rule, context?: SchedulePlanContext) {
  const extras = [...onboardingStore.getState().data.extraRules, extra];
  assertScheduleRepresentable(proposedPlan(a, base, extras).rules, context);
  onboardingStore.getState().patch({ extraRules: extras });
}
export function removeExtraRule(id: string) {
  onboardingStore.getState().patch({ extraRules: onboardingStore.getState().data.extraRules.filter((rule) => rule.id !== id) });
}
export function stagePlan(a: Answers, base?: RuleDraft, context?: SchedulePlanContext) {
  const { rule, rules } = proposedPlan(a, base);
  assertScheduleRepresentable(rules, context);
  onboardingStore.getState().patch({
    answers: {
      ...a,
      ruleId: rule.id,
      ruleCreatedAt: rule.createdAt,
      ruleCommitted: false,
      ruleCommittedFor: '',
    },
  });
  return rule;
}
export function commitStagedPlan(userId: string, unit: 'km' | 'mi', context?: SchedulePlanContext) {
  const a = onboardingStore.getState().data.answers;
  if (!a.ruleId || a.ruleCommitted !== false) return null;
  const { rule, rules } = proposedPlan(a);
  if (a.ruleCommittedFor === userId) return rule;
  assertScheduleRepresentable(rules, context);
  rulesStore.getState().patch({ rules });
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
    .patch({
      answers: { ...a, ruleId: rule.id, ruleCreatedAt: rule.createdAt, ruleCommitted: true, ruleCommittedFor: userId },
    });
  return rule;
}
export function goalStep(d: RuleDraft) {
  if (d.activity === 'walking') return d.walkingMode === 'state' ? 'W2' : 'W3';
  return d.gymMode === 'time' ? 'G2' : 'G1';
}

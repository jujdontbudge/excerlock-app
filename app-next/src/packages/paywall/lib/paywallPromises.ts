import { bodyGoals, type Answers } from '../../model/answers';
import type { Rule } from '../../model/types';
import type { IconName } from '../../ui/Icon';
import { bodyTargetPounds } from '../../onboarding/bodyTargetPounds';
import { impactSummary } from '../../onboarding/model';
import { ruleName } from '../../conditions/ruleName';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';

const c = subscriptionCopy.promises;
const defaultMinutes = 180;

export type PaywallPromise = { icon: IconName; text: string };

function conditionPromise(rule: Rule): string {
  if (rule.mode.kind === 'state') return rule.mode.activity === 'gym' ? c.condition.gym : c.condition.walking;
  return c.condition.target(ruleName(rule));
}

export function paywallPromises(answers: Answers, rule?: Rule): PaywallPromise[] {
  const goals = bodyGoals(answers);
  const body: PaywallPromise[] = [
    ...(goals.includes('lose') ? [{ icon: 'flame' as const, text: c.body.lose(bodyTargetPounds(answers, 'O24')) }] : []),
    ...(goals.includes('gain') ? [{ icon: 'gym' as const, text: c.body.gain(bodyTargetPounds(answers, 'O23')) }] : []),
  ];
  const dream = answers.improveFirst === 'exercise' || answers.improveFirst === 'screenTime' || answers.improveFirst === 'wellness'
    ? c.dream[answers.improveFirst]
    : c.dream.other;
  const minutes = Number(answers.estimatedDailyMinutes ?? defaultMinutes);
  const { hours } = impactSummary(Number.isFinite(minutes) && minutes > 0 ? minutes : defaultMinutes);
  return [
    ...(body.length ? body : [{ icon: 'heart' as const, text: goals.includes('maintain') ? c.body.maintain : c.body.fallback }]),
    rule ? { icon: rule.activity, text: conditionPromise(rule) } : { icon: 'heart', text: dream },
    { icon: 'clock', text: c.time(Math.max(0.5, Math.round(hours * 2) / 2)) },
  ];
}

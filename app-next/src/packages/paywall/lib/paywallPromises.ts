import { bodyGoals, type Answers } from '../../model/answers';
import type { Rule } from '../../model/types';
import { bodyTargetPounds } from '../../onboarding/bodyTargetPounds';
import { impactSummary } from '../../onboarding/model';
import { ruleName } from '../../conditions/ruleName';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';

const c = subscriptionCopy.promises;
const defaultMinutes = 180;

const marks = { lose: '🔥', gain: '💪', health: '❤️', walking: '🚶', gym: '🏋️', dream: '✨', time: '📵' } as const;

export type PaywallPromise = { mark: string; text: string };

function conditionPromise(rule: Rule): string {
  if (rule.mode.kind === 'state') return rule.mode.activity === 'gym' ? c.condition.gym : c.condition.walking;
  return c.condition.target(ruleName(rule));
}

export function paywallPromises(answers: Answers, rule?: Rule): PaywallPromise[] {
  const goals = bodyGoals(answers);
  const body: PaywallPromise[] = [
    ...(goals.includes('lose') ? [{ mark: marks.lose, text: c.body.lose(bodyTargetPounds(answers, 'O24')) }] : []),
    ...(goals.includes('gain') ? [{ mark: marks.gain, text: c.body.gain(bodyTargetPounds(answers, 'O23')) }] : []),
  ];
  const dream = answers.improveFirst === 'exercise' || answers.improveFirst === 'screenTime' || answers.improveFirst === 'wellness'
    ? c.dream[answers.improveFirst]
    : c.dream.other;
  const minutes = Number(answers.estimatedDailyMinutes ?? defaultMinutes);
  const { hours } = impactSummary(Number.isFinite(minutes) && minutes > 0 ? minutes : defaultMinutes);
  return [
    ...(body.length ? body : [{ mark: marks.health, text: goals.includes('maintain') ? c.body.maintain : c.body.fallback }]),
    rule ? { mark: marks[rule.activity], text: conditionPromise(rule) } : { mark: marks.dream, text: dream },
    { mark: marks.time, text: c.time(Math.max(0.5, Math.round(hours * 2) / 2)) },
  ];
}

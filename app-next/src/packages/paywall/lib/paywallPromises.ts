import type { Answers } from '../../model/answers';
import { impactSummary } from '../../onboarding/model';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';

const c = subscriptionCopy.promises;
const defaultMinutes = 180;

export function paywallPromises(answers: Answers): [string, string, string] {
  const body = answers.bodyGoal === 'lose' || answers.bodyGoal === 'gain' || answers.bodyGoal === 'maintain'
    ? c.body[answers.bodyGoal]
    : c.body.fallback;
  const dream = answers.improveFirst === 'exercise' || answers.improveFirst === 'screenTime' || answers.improveFirst === 'wellness'
    ? c.dream[answers.improveFirst]
    : c.dream.other;
  const minutes = Number(answers.estimatedDailyMinutes ?? defaultMinutes);
  const { days } = impactSummary(Number.isFinite(minutes) && minutes > 0 ? minutes : defaultMinutes);
  return [body, dream, c.time(days)];
}

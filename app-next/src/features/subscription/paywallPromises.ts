import type { Answers } from '../../onboarding/types';
import { impactSummary } from '../onboarding/impact/model';
import { subscriptionCopy } from '../../content/subscription';

const c = subscriptionCopy.promises;
const defaultMinutes = 180;

/** The three dreams the paywall sells, drawn from the body goal, main goal and scrolling time the user gave. */
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

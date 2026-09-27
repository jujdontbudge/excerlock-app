import { bodyGoals, type Answers } from '../../model/answers';
import { bodyTargetPounds } from '../../onboarding/bodyTargetPounds';
import { impactSummary } from '../../onboarding/model';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';

const c = subscriptionCopy.promises;
const defaultMinutes = 180;

export function paywallPromises(answers: Answers): [string, string, string] {
  const goals = bodyGoals(answers);
  const body = [
    ...(goals.includes('lose') ? [c.body.lose(bodyTargetPounds(answers, 'O24'))] : []),
    ...(goals.includes('gain') ? [c.body.gain(bodyTargetPounds(answers, 'O23'))] : []),
  ];
  const dream = answers.improveFirst === 'exercise' || answers.improveFirst === 'screenTime' || answers.improveFirst === 'wellness'
    ? c.dream[answers.improveFirst]
    : c.dream.other;
  const minutes = Number(answers.estimatedDailyMinutes ?? defaultMinutes);
  const { days } = impactSummary(Number.isFinite(minutes) && minutes > 0 ? minutes : defaultMinutes);
  const time = c.time(days);
  if (body.length === 2) return [body[0], body[1], time];
  return [body[0] ?? (goals.includes('maintain') ? c.body.maintain : c.body.fallback), dream, time];
}

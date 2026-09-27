import type { Answers, BodyGoal } from '../../model/answers';

export type BodyTargetStep = 'O23' | 'O24';

export const bodyTargets = {
  O23: {
    goal: 'gain',
    key: 'muscleGainLb',
    title: 'How many pounds of muscle do you want to gain?',
    caption: 'Gain muscle',
    min: 1,
    max: 40,
    fallback: 10,
    plan: (pounds: number) => `Gain ${pounds.toFixed(1)} lb of muscle`,
  },
  O24: {
    goal: 'lose',
    key: 'fatLossLb',
    title: 'How many pounds of fat do you want to lose?',
    caption: 'Lose fat',
    min: 1,
    max: 100,
    fallback: 15,
    plan: (pounds: number) => `Lose ${pounds.toFixed(1)} lb of fat`,
  },
} as const satisfies Record<BodyTargetStep, { goal: BodyGoal; key: string; title: string; caption: string; min: number; max: number; fallback: number; plan: (pounds: number) => string }>;

export const bodyTargetUnit = 'lb';

export function bodyTargetPounds(answers: Answers, step: BodyTargetStep): number {
  const target = bodyTargets[step];
  const raw = Number(answers[target.key]);
  return Number.isFinite(raw) && raw >= target.min && raw <= target.max && Math.abs(raw * 10 - Math.round(raw * 10)) < 0.000001
    ? raw
    : target.fallback;
}

export function bodyTargetStepFor(goal: BodyGoal): BodyTargetStep | null {
  return goal === 'gain' ? 'O23' : goal === 'lose' ? 'O24' : null;
}

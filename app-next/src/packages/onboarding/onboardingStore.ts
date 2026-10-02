import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
export type Answers = Record<string, string | number | boolean | number[] | string[]>;
export type OnboardingState = {
  step: string;
  seenSteps: string[];
  completedSteps: string[];
  flowVersion: number;
  flowOrder: { preBranch: string[]; tail: string[] } | null;
  started: boolean;
  answers: Answers;
  complete: boolean;
  setupStep: string;
  setupComplete: boolean;
  winbackDeclined: boolean;
};
const step = (value: unknown) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value);
const answers = (value: unknown) =>
  v.object(value) &&
  Object.entries(value).every(([key, x]) => key === 'currentDailySteps'
    ? v.number(0, 20000)(x)
    : v.text(x) || v.number(0, 30000)(x) || v.bool(x) || v.array(v.number(0, 6))(x) || v.array(v.text)(x));
export const onboardingStore = createPersistedStore<OnboardingState>(
  'onboarding',
  { step: 'O01', seenSteps: [], completedSteps: [], flowVersion: 0, flowOrder: null, started: false, answers: {}, complete: false, setupStep: 'X1', setupComplete: false, winbackDeclined: false },
  {
    step,
    seenSteps: v.array(step),
    completedSteps: v.array(step),
    flowVersion: v.number(0, Number.MAX_SAFE_INTEGER),
    flowOrder: (value) => value === null || (v.object(value) && v.array(step)(value.preBranch) && v.array(step)(value.tail)),
    started: v.bool,
    answers,
    complete: v.bool,
    setupStep: (value) => typeof value === 'string' && /^(X[1-6]|done)$/.test(value),
    setupComplete: v.bool,
    winbackDeclined: v.bool,
  },
);

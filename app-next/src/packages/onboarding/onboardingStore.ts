import { createPersistedStore } from '../persistence/createPersistedStore';
import { isOnboardingStepId } from './lib/stepId';
import * as v from '../persistence/validation';
export type Answers = Record<string, string | number | boolean | number[]>;
export type OnboardingState = {
  step: string;
  answers: Answers;
  complete: boolean;
  setupStep: string;
  setupComplete: boolean;
  winbackDeclined: boolean;
};
const step = isOnboardingStepId;
const answers = (value: unknown) =>
  v.object(value) &&
  Object.entries(value).every(([key, x]) => key === 'currentDailySteps'
    ? v.number(0, 20000)(x)
    : v.text(x) || v.number(0, 30000)(x) || v.bool(x) || v.array(v.number(0, 6))(x));
export const onboardingStore = createPersistedStore<OnboardingState>(
  'onboarding',
  { step: 'O01', answers: {}, complete: false, setupStep: 'X1', setupComplete: false, winbackDeclined: false },
  {
    step,
    answers,
    complete: v.bool,
    setupStep: (value) => typeof value === 'string' && /^(X[1-6]|done)$/.test(value),
    setupComplete: v.bool,
    winbackDeclined: v.bool,
  },
);

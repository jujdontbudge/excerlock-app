import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export type Answers = Record<string, string | number | boolean | number[]>;
export type OnboardingState = {
  step: string;
  answers: Answers;
  complete: boolean;
  setupStep: string;
  setupComplete: boolean;
};
const step = (value: unknown) =>
  typeof value === 'string' && /^(O(0[1-9]|1[0-9]|20)|W[1-3]|G[12]|[RB][12]|D|S[1-4]|T[1-4]|P)$/.test(value);
const answers = (value: unknown) =>
  v.object(value) &&
  Object.values(value).every((x) => v.text(x) || v.number(0, 30000)(x) || v.bool(x) || v.array(v.number(0, 6))(x));
export const onboardingStore = createPersistedStore<OnboardingState>(
  'onboarding',
  { step: 'O01', answers: {}, complete: false, setupStep: 'X1', setupComplete: false },
  {
    step,
    answers,
    complete: v.bool,
    setupStep: (value) => typeof value === 'string' && /^(X[1-6]|done)$/.test(value),
    setupComplete: v.bool,
  },
);

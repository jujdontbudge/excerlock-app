import { createPersistedStore } from '../persistence/createPersistedStore';
import { isOnboardingStepId } from './lib/stepId';
import * as v from '../persistence/validation';
import { Rule } from '../model/types';
import { validateRule } from '../conditions/validateRule';
import type { OnboardingOffer } from '../ports/OnboardingOfferPort';
export type Answers = Record<string, string | number | boolean | number[] | string[]>;
export type OnboardingState = {
  step: string;
  answers: Answers;
  complete: boolean;
  setupStep: string;
  setupComplete: boolean;
  winbackDeclined: boolean;
  closeOfferSeen: boolean;
  extraRules: Rule[];
  offer: OnboardingOffer | null;
};
const step = isOnboardingStepId;
const answers = (value: unknown) =>
  v.object(value) &&
  Object.entries(value).every(([key, x]) => key === 'currentDailySteps'
    ? v.number(0, 20000)(x)
    : v.text(x) || v.number(0, 30000)(x) || v.bool(x) || v.array(v.number(0, 6))(x) || v.array(v.text)(x));
export const onboardingStore = createPersistedStore<OnboardingState>(
  'onboarding',
  { step: 'O01', answers: {}, complete: false, setupStep: 'X1', setupComplete: false, winbackDeclined: false, closeOfferSeen: false, extraRules: [], offer: null },
  {
    step,
    answers,
    complete: v.bool,
    setupStep: (value) => typeof value === 'string' && /^(X[1-6]|done)$/.test(value),
    setupComplete: v.bool,
    winbackDeclined: v.bool,
    closeOfferSeen: v.bool,
    extraRules: (value) => Array.isArray(value) && value.every((rule) => validateRule(rule).length === 0),
    offer: v.nullable(v.shape({
      arm: v.oneOf(['a', 'b']),
      assigned: v.oneOf(['a', 'b']),
      source: v.oneOf(['adapty', 'fallback']),
      offer: v.shape({ trialDays: v.number(1), reminderDaysBefore: v.number(0), label: v.text }),
      trialAvailable: v.bool,
      variationId: v.text,
    })),
  },
);

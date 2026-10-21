import { beginOnboarding, beginPaywall, beginWelcome } from '../journey/index';
import { onboardingStore } from './onboardingStore';
import { resumeStep } from './lib/flow';

export function onboardingResumeStep() {
  const saved = onboardingStore.getState().data;
  const replayingStagedPlan = saved.answers.ruleCommitted === false && saved.answers.returnTo !== 'S3' &&
    /^(O|W|G|R|B|D|S1)/.test(saved.step);
  return saved.complete || saved.setupComplete || replayingStagedPlan ? 'P' : resumeStep(saved);
}

export function markOnboardingPaywall() {
  const saved = onboardingStore.getState().data;
  if (saved.step !== 'P' || !saved.complete) onboardingStore.getState().patch({ step: 'P', complete: true });
}

export function openOnboardingPaywall(): '/paywall' {
  markOnboardingPaywall();
  beginOnboarding();
  beginPaywall();
  return '/paywall';
}

export function resumeOnboarding(firstStep?: 'O04'): '/paywall' | `/onboarding/${string}` {
  const saved = onboardingResumeStep();
  const step = firstStep && ['O01', 'O02', 'O03'].includes(saved) ? firstStep : saved;
  if (step === 'P') return openOnboardingPaywall();
  if (step === 'O01') beginWelcome();
  else beginOnboarding();
  return `/onboarding/${step}`;
}

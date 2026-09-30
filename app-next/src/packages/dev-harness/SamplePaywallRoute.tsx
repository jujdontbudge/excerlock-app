import { useEffect } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { onboardingStore } from '../onboarding/onboardingStore';
import { stagePlan } from '../onboarding/OnboardingPlan';
import { beginPaywall, useJourney } from '../journey/index';
import { useRuntime } from '../ports/useRuntime';
import { ScreenShell } from '../ui';
import type { Answers } from '../model/answers';

const sampleAnswers: Answers = {
  gender: 'female',
  name: 'Alex',
  referralSource: 'instagram',
  ageBand: '25–34',
  improveFirst: 'exercise',
  bodyGoal: ['lose'],
  fatLossLb: 15,
  estimatedDailyMinutes: 180,
  activity: 'walking',
  currentDailySteps: 2500,
  walkingMode: 'steps',
  stepGoal: 10000,
  days: [1, 2, 3, 4, 5],
  allDay: false,
  startMinute: 540,
  endMinute: 1260,
};

export function SamplePaywallRoute() {
  const router = useRouter(),
    phase = useJourney(useRuntime()).phase;
  useEffect(() => {
    if (!__DEV__ || Constants.isDevice) {
      router.replace('/');
      return;
    }
    onboardingStore.getState().patch({ step: 'P', complete: false, setupComplete: false, answers: sampleAnswers });
    stagePlan(sampleAnswers);
    beginPaywall();
  }, [router]);
  useEffect(() => {
    if (phase === 'paywall') router.replace('/paywall');
  }, [phase, router]);
  return <ScreenShell>{null}</ScreenShell>;
}

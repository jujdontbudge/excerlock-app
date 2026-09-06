import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { nextStep, prevStep, progressFraction, resumeStep } from '../../onboarding/flow';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
export function useOnboarding() {
  const params = useLocalSearchParams<{ step: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = params.step ?? resumeStep(state),
    flow = { step, answers: state.answers };
  useEffect(() => {
    useOnboardingStore.getState().patch({ step });
    runtime.analytics.screen(step);
  }, [step, runtime]);
  const move = (next: string, back = false) => {
    Keyboard.dismiss();
    setDirection(back ? 'back' : 'forward');
    useOnboardingStore.getState().patch({ step: next });
    if (next === 'P') router.replace('/paywall');
    else router.setParams({ step: next });
  };
  return {
    step,
    answers: state.answers,
    direction,
    progress: progressFraction(flow),
    setAnswer: (key: string, value: string | number | boolean | number[]) =>
      useOnboardingStore.getState().patch({ answers: { ...useOnboardingStore.getState().data.answers, [key]: value } }),
    advance: () => {
      if (step === 'O10' && state.answers.estimatedDailyMinutes === undefined)
        useOnboardingStore.getState().patch({ answers: { ...state.answers, estimatedDailyMinutes: 180 } });
      move(nextStep(flow));
    },
    back: () => move(prevStep(flow), true),
  };
}

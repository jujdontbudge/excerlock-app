import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { nextStep, prevStep, progressFraction, resumeStep } from '../../onboarding/flow';
import { createDraft } from '../rules/draft';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { Answers } from '../../onboarding/types';
export function useOnboarding() {
  const params = useLocalSearchParams<{ step: string; returnTo?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = params.step ?? resumeStep(state),
    flow = { step, answers: state.answers };
  useEffect(() => {
    useOnboardingStore.getState().patch({ step });
    const current = useOnboardingStore.getState().data.answers;
    if (step.startsWith('S') && !current.ruleId) {
      const draft = createDraft('walking');
      useOnboardingStore
        .getState()
        .patch({ answers: { ...current, ruleId: draft.id, ruleCreatedAt: draft.createdAt } });
    }
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
      const destination = params.returnTo || String(state.answers.returnTo || '');
      if (destination) {
        useOnboardingStore.getState().patch({ answers: { ...state.answers, returnTo: '', editBackup: '' } });
        router.setParams({ returnTo: undefined });
        move(destination);
      } else move(nextStep(flow));
    },
    edit: (target: string) => {
      useOnboardingStore
        .getState()
        .patch({ answers: { ...state.answers, returnTo: 'S3', editBackup: JSON.stringify(state.answers) } });
      setDirection('back');
      router.setParams({ step: target, returnTo: 'S3' });
    },
    back: () => {
      const destination = params.returnTo || String(state.answers.returnTo || '');
      if (destination) {
        let restored = state.answers;
        try {
          const backup = JSON.parse(String(state.answers.editBackup || 'null'));
          if (backup && typeof backup === 'object' && !Array.isArray(backup)) restored = backup as Answers;
        } catch {
          /* An older draft may not have a saved edit snapshot. */
        }
        useOnboardingStore.getState().patch({ answers: { ...restored, returnTo: '', editBackup: '' } });
        router.setParams({ returnTo: undefined });
        move(destination);
      } else move(prevStep(flow), true);
    },
  };
}

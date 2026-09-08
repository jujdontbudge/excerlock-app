import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { nextStep, prevStep, pathFor, progressFraction, resumeStep } from '../../onboarding/flow';
import { createDraft } from '../rules/draft';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { Answers } from '../../onboarding/types';
import { planCopy } from '../../content/plan';
export function useOnboarding() {
  const params = useLocalSearchParams<{ step: string; returnTo?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    [direction, setDirection] = useState<'forward' | 'back'>('forward'),
    // The pre-edit answers live on the route, never in the validated answers map:
    // a multi-branch answer set outgrows the 500-character value cap (finding 102).
    [editBackup, setEditBackup] = useState<Answers | null>(null),
    [error, setError] = useState('');
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
    error,
    progress: progressFraction(flow),
    setAnswer: (key: string, value: string | number | boolean | number[]) =>
      useOnboardingStore.getState().patch({ answers: { ...useOnboardingStore.getState().data.answers, [key]: value } }),
    advance: () => {
      if (step === 'O10' && state.answers.estimatedDailyMinutes === undefined)
        useOnboardingStore.getState().patch({ answers: { ...state.answers, estimatedDailyMinutes: 180 } });
      const destination = params.returnTo || String(state.answers.returnTo || '');
      // An edit walks the rest of its branch, so a changed mode always reaches its goal screen (B28).
      const path = pathFor(state.answers),
        following = nextStep(flow);
      if (destination && path.indexOf(step) < path.indexOf('S1') && following !== 'S1') return move(following);
      if (destination) {
        setEditBackup(null);
        setError('');
        useOnboardingStore.getState().patch({ answers: { ...state.answers, returnTo: '' } });
        router.setParams({ returnTo: undefined });
        move(destination);
      } else move(nextStep(flow));
    },
    edit: (target: string) => {
      // Store the snapshot before returnTo exists, so Back can never find one without the other.
      setEditBackup(state.answers);
      setError('');
      useOnboardingStore.getState().patch({ answers: { ...state.answers, returnTo: 'S3' } });
      setDirection('back');
      router.setParams({ step: target, returnTo: 'S3' });
    },
    back: () => {
      const destination = params.returnTo || String(state.answers.returnTo || '');
      if (destination) {
        if (!editBackup) return setError(planCopy.restoreFailed);
        setEditBackup(null);
        setError('');
        useOnboardingStore.getState().patch({ answers: { ...editBackup, returnTo: '' } });
        router.setParams({ returnTo: undefined });
        move(destination);
      } else move(prevStep(flow), true);
    },
  };
}

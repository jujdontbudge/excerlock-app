import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { nextStep, prevStep, progressFraction, resumeStep, type FlowOrder } from '../../onboarding/flow';
import { createDraft } from '../rules/draft';
import { draftFromAnswers } from '../rules/answersDraft';
import { scenarioFor } from './condition-demo/model';
import { profileStore } from '../../state/profileStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { Answers } from '../../onboarding/types';
import { applyReviewPreset, isReviewPresetName } from './reviewPreset';
export function useOnboarding() {
  const params = useLocalSearchParams<{ step: string; returnTo?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    advancing = useRef(false),
    advanceEpoch = useRef(0),
    mounted = useRef(true),
    // Seeded from the port's current snapshot, so a remount after the rail
    // settled keeps the assignment without a setState-in-effect.
    [flowOrder, setFlowOrder] = useState<FlowOrder | null>(() => runtime.onboardingFlow?.order() ?? null),
    [isAdvancing, setIsAdvancing] = useState(false),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = params.step ?? resumeStep(state, flowOrder),
    flow = { step, answers: state.answers };
  // B8: read the `onboarding_variant` order once, in the background. The first
  // paint above already used the bundled order, and the rail only replaces it
  // when a payload validates — the user never waits on a flag to see a step.
  useEffect(() => {
    const port = runtime.onboardingFlow;
    if (!port) return;
    const stop = port.subscribe(setFlowOrder);
    void port.load();
    return stop;
  }, [runtime]);
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
    if (step === 'S3b') {
      const demo = scenarioFor(draftFromAnswers(current), profileStore.getState().data.walkPlaces.join(','));
      runtime.analytics.track('onboarding_screen_viewed', {
        screen: 'plan-demo', scenario: demo.kind, ...(demo.kind === 'walk-state' ? { place: demo.place } : {}),
      });
    }
    return () => { advanceEpoch.current += 1; };
  }, [step, runtime]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const move = (next: string, back = false) => {
    advanceEpoch.current += 1;
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
    isAdvancing,
    progress: progressFraction(flow, flowOrder),
    setAnswer: (key: string, value: string | number | boolean | number[]) => {
      if (key === 'name') advanceEpoch.current += 1;
      useOnboardingStore.getState().patch({ answers: { ...useOnboardingStore.getState().data.answers, [key]: value } });
    },
    advance: async () => {
      if (advancing.current) return;
      advancing.current = true;
      setIsAdvancing(true);
      const epoch = advanceEpoch.current;
      try {
      if (step === 'O04') {
        const latest = useOnboardingStore.getState().data.answers;
        const local = isReviewPresetName(latest.name);
        let remote = false;
        if (!local) {
          try { remote = await runtime.reviewPreset?.isEnabled() ?? false; }
          catch { remote = false; }
        }
        const live = useOnboardingStore.getState().data;
        if (!mounted.current || advanceEpoch.current !== epoch || live.step !== 'O04' || live.answers.name !== latest.name) return;
        if (local || remote) {
          const applied = applyReviewPreset(live.answers, {
            enabled: true, now: runtime.clock.now(), timezone: runtime.clock.timezone(),
          });
          useOnboardingStore.getState().patch({ answers: applied });
          if (remote && applied !== live.answers) {
            try { runtime.reviewPreset?.expose(); } catch { /* Telemetry cannot block onboarding. */ }
          }
        }
      }
      if (step === 'O10' && state.answers.estimatedDailyMinutes === undefined)
        useOnboardingStore.getState().patch({ answers: { ...state.answers, estimatedDailyMinutes: 180 } });
      const currentAnswers = useOnboardingStore.getState().data.answers;
      const destination = params.returnTo || String(currentAnswers.returnTo || '');
      if (destination) {
        useOnboardingStore.getState().patch({ answers: { ...currentAnswers, returnTo: '', editBackup: '' } });
        router.setParams({ returnTo: undefined });
        move(destination);
      } else {
        const latest = useOnboardingStore.getState().data.answers;
        move(nextStep({ step, answers: latest }, flowOrder));
      }
      } finally {
        advancing.current = false;
        if (mounted.current) setIsAdvancing(false);
      }
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
      } else move(prevStep(flow, flowOrder), true);
    },
  };
}

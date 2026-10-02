import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboardingStore';
import { nextStep, prevStep, progressFraction, resumeStep, pathFor, preBranch, tail, type FlowOrder } from './flow';
import { createDraft } from '../../conditions/draft';
import { draftFromAnswers } from '../../conditions/answersDraft';
import { scenarioFor } from './condition-demo/model';
import { profileStore } from '../../preferences/profileStore';
import { useRuntime } from '../../ports/useRuntime';
import { Answers } from '../../model/answers';
import { applyReviewPreset, isReviewPresetName } from './reviewPreset';
import { beginPaywall, currentJourney } from '../../journey/index';
import { reloadAtOnboardingBoundary, runningOnboardingFlowVersion } from '../../updates/updates';
import { tokens } from '../../ui/tokens';
import { bodyTargetPounds } from './bodyTargetCopy';

const onboardingReturnDestination = (...values: unknown[]) =>
  values.find((value): value is 'S3' => value === 'S3') ?? '';

export function useOnboarding(options?: { isPageStable: () => boolean }) {
  const params = useLocalSearchParams<{ step: string; returnTo?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    advancing = useRef(false),
    advanceEpoch = useRef(0),
    mounted = useRef(true),
    [flowOrder, setFlowOrder] = useState<FlowOrder | null>(() => useOnboardingStore.getState().data.flowOrder ?? runtime.onboardingFlow?.order() ?? null),
    [isAdvancing, setIsAdvancing] = useState(false),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = params.step ?? resumeStep(state, flowOrder),
    flow = { step, answers: state.answers };
  useEffect(() => {
    const port = runtime.onboardingFlow;
    if (!port) return;
    const stop = port.subscribe((order) => { if (!useOnboardingStore.getState().data.started) setFlowOrder(order); });
    void port.load();
    return stop;
  }, [runtime]);
  useEffect(() => {
    const previous = useOnboardingStore.getState().data;
    useOnboardingStore.getState().patch({ step, seenSteps: [...new Set([...previous.seenSteps, step])] });
    const current = useOnboardingStore.getState().data.answers;
    if (step.startsWith('S') && !current.ruleId) {
      const draft = createDraft('walking');
      useOnboardingStore
        .getState()
        .patch({ answers: { ...current, ruleId: draft.id, ruleCreatedAt: draft.createdAt } });
    }
    runtime.analytics.screen(step);
    if (step === 'S4' || step === 'S5') {
      runtime.analytics.track('onboarding_screen_viewed', { screen: step === 'S4' ? 'research' : 'rating' });
    }
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
  const settledAt = useRef(0);
  const nativeTransition = useRef<{ step: string; busy: boolean }>({ step: '', busy: false });
  const transitionWaiters = useRef(new Set<() => void>());
  useEffect(() => { settledAt.current = performance.now() + tokens.motion.duration.emphasized; }, [step]);
  const move = async (next: string, back = false) => {
    const epoch = advanceEpoch.current;
    const from = step;
    const stable = () => mounted.current && advanceEpoch.current === epoch && !nativeTransition.current.busy &&
      useOnboardingStore.getState().data.step === from && ['welcome', 'onboarding'].includes(currentJourney().phase);
    const delay = Math.max(0, settledAt.current - performance.now());
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    if (nativeTransition.current.busy) await new Promise<void>((resolve) => {
      const done = () => { clearTimeout(timer); transitionWaiters.current.delete(done); resolve(); };
      const timer = setTimeout(done, tokens.motion.duration.emphasized * 2);
      transitionWaiters.current.add(done);
    });
    if (!stable()) return;
    const saved = useOnboardingStore.getState().data;
    const currentPath = pathFor(saved.answers, flowOrder);
    const selectedOrder = currentPath.includes(from) ? flowOrder : null;
    const beforeTarget = new Set(currentPath.slice(0, Math.max(0, currentPath.indexOf(next))));
    useOnboardingStore.getState().patch({ started: true, complete: false,
      completedSteps: back ? saved.completedSteps.filter((id) => beforeTarget.has(id))
        : [...new Set([...(from === 'O01' ? [] : saved.completedSteps), from])],
      flowVersion: runningOnboardingFlowVersion(),
      flowOrder: { preBranch: [...(selectedOrder?.preBranch ?? preBranch)], tail: [...(selectedOrder?.tail ?? tail)] },
    });
    const boundary = await reloadAtOnboardingBoundary({ next, isStable: () => stable() && (options?.isPageStable() ?? true), persist: async () => { await Promise.all([useOnboardingStore.persistBarrier(), profileStore.persistBarrier(), runtime.status.flush()]); } }).catch(() => 'continue');
    if (boundary !== 'continue') return;
    if (!stable()) return;
    advanceEpoch.current += 1;
    Keyboard.dismiss();
    setDirection(back ? 'back' : 'forward');
    useOnboardingStore.getState().patch({ step: next, complete: next === 'P' });
    if (next === 'P') { beginPaywall(); router.replace('/paywall'); }
    else router.setParams({ step: next });
  };
  return {
    step,
    answers: state.answers,
    direction,
    isAdvancing,
    transitionStarted: (page: string) => { nativeTransition.current = { step: page, busy: true }; },
    transitionSettled: (page: string) => {
      if (nativeTransition.current.step !== page) return;
      nativeTransition.current = { step: page, busy: false };
      for (const done of transitionWaiters.current) done();
    },
    progress: progressFraction(flow, flowOrder),
    setAnswer: (key: string, value: string | number | boolean | number[] | string[]) => {
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
            try { runtime.reviewPreset?.expose(); } catch {}
          }
        }
      }
      if (step === 'O10' && state.answers.estimatedDailyMinutes === undefined)
        useOnboardingStore.getState().patch({ answers: { ...state.answers, estimatedDailyMinutes: 180 } });
      const beforeDefaults = useOnboardingStore.getState().data.answers;
      const defaultDraft = draftFromAnswers(beforeDefaults);
      const defaults = step === 'O23' ? { muscleGainLb: bodyTargetPounds(beforeDefaults, 'O23') }
        : step === 'O24' ? { fatLossLb: bodyTargetPounds(beforeDefaults, 'O24') }
        : step === 'W1' ? { walkPlaces: profileStore.getState().data.walkPlaces }
        : step === 'W2' ? { walkingMode: defaultDraft.walkingMode }
        : step === 'W3' ? { walkingMode: defaultDraft.walkingMode, stepGoal: defaultDraft.stepGoal, walkMinutes: defaultDraft.walkMinutes }
        : step === 'G1' ? { gymMode: defaultDraft.gymMode }
        : step === 'G2' ? { gymMode: defaultDraft.gymMode, gymMinutes: defaultDraft.gymMinutes } : {};
      useOnboardingStore.getState().patch({ answers: { ...beforeDefaults, ...defaults } as Answers });
      const currentAnswers = useOnboardingStore.getState().data.answers;
      const destination = onboardingReturnDestination(params.returnTo, currentAnswers.returnTo);
      if (destination) {
        useOnboardingStore.getState().patch({ answers: { ...currentAnswers, returnTo: '', editBackup: '' } });
        router.setParams({ returnTo: undefined });
        await move(destination);
      } else {
        const latest = useOnboardingStore.getState().data.answers;
        await move(nextStep({ step, answers: latest }, flowOrder));
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
    back: async () => {
      if (advancing.current) return;
      advancing.current = true;
      setIsAdvancing(true);
      try {
      const destination = onboardingReturnDestination(params.returnTo, state.answers.returnTo);
      if (destination) {
        let restored = state.answers;
        try {
          const backup = JSON.parse(String(state.answers.editBackup || 'null'));
          if (backup && typeof backup === 'object' && !Array.isArray(backup)) restored = backup as Answers;
        } catch {
        }
        useOnboardingStore.getState().patch({ answers: { ...restored, returnTo: '', editBackup: '' } });
        router.setParams({ returnTo: undefined });
        await move(destination);
      } else await move(prevStep(flow, flowOrder), true);
      } finally { advancing.current = false; if (mounted.current) setIsAdvancing(false); }
    },
  };
}

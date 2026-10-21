import { useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { SetupFlow, savedSetupStep, type SetupStep } from './SetupFlow';
import { beginPaywall, currentJourney, currentSetupAdmission, finishSetup } from '../journey/index';
import { commitStagedPlan } from '../onboarding/OnboardingPlan';
import { settingsStore } from '../preferences/settingsStore';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { ScreenShell } from '../ui';
export function SetupRoute() {
  const router = useRouter(),
    runtime = useRuntime(),
    { step } = useLocalSearchParams<{ step?: string }>(),
    admission = currentSetupAdmission(runtime),
    noConditions = useRulesStore((state) => state.data.rules.length === 0),
    needsStagedPlan = currentJourney().entryIntent === 'onboarding' || noConditions,
    stagedPlanCommitted = useOnboardingStore((state) => state.data.answers.ruleCommitted !== false),
    resumeAt = useOnboardingStore((state) => savedSetupStep(state.data.setupStep)),
    setupComplete = useOnboardingStore((state) => state.data.setupComplete);
  useEffect(() => {
    if (currentJourney().phase !== 'setup') return;
    if (!admission) {
      beginPaywall();
      router.replace('/paywall');
      return;
    }
    if (needsStagedPlan && !stagedPlanCommitted) {
      commitStagedPlan(admission.userId, settingsStore.getState().data.units, {
        now: runtime.clock.now(),
        timezone: runtime.clock.timezone(),
      });
    }
  }, [admission, needsStagedPlan, router, runtime, stagedPlanCommitted]);
  const show = useCallback(
    (next: SetupStep) => {
      if (useOnboardingStore.getState().data.setupStep !== next) useOnboardingStore.getState().patch({ setupStep: next });
      if (next !== step) router.setParams({ step: next });
    },
    [router, step],
  );
  const done = useCallback(() => {
    if (currentJourney().phase === 'app') {
      router.dismissAll();
      router.replace('/');
      return;
    }
    const admission = currentSetupAdmission(runtime);
    if (!admission) {
      beginPaywall();
      router.replace('/paywall');
      return;
    }
    if (!finishSetup(runtime)) {
      beginPaywall();
      router.replace('/paywall');
      return;
    }
    runtime.analytics.screen('/setup/done');
    useOnboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
    router.dismissAll();
    router.replace('/');
  }, [router, runtime]);
  useEffect(() => {
    if (admission && setupComplete) done();
  }, [admission, setupComplete, done]);
  if (!admission || setupComplete || (needsStagedPlan && !stagedPlanCommitted)) return <ScreenShell>{null}</ScreenShell>;
  return <SetupFlow account resumeAt={resumeAt} onDone={done} onStep={show} />;
}

import { useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { SetupFlow, type SetupStep } from './SetupFlow';
import { beginPaywall, currentJourney, currentSetupAdmission, finishSetup } from '../journey/index';
import { commitStagedPlan } from '../onboarding/OnboardingPlan';
import { settingsStore } from '../preferences/settingsStore';
import { ScreenShell } from '../ui';
export function SetupRoute() {
  const router = useRouter(),
    runtime = useRuntime(),
    { step } = useLocalSearchParams<{ step?: string }>(),
    admission = currentSetupAdmission(runtime),
    needsStagedPlan = currentJourney().entryIntent === 'onboarding',
    stagedPlanCommitted = useOnboardingStore((state) => state.data.answers.ruleCommitted !== false);
  useEffect(() => {
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
      if (next !== step) router.setParams({ step: next });
    },
    [router, step],
  );
  const done = useCallback(() => {
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
    router.replace('/(tabs)/home');
  }, [router, runtime]);
  if (!admission || (needsStagedPlan && !stagedPlanCommitted)) return <ScreenShell>{null}</ScreenShell>;
  return <SetupFlow account onDone={done} onStep={show} />;
}

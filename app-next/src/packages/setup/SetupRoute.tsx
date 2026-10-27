import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { SetupFlow, type SetupStep } from './SetupFlow';
import { beginPaywall, currentJourney, finishSetup, useJourney } from '../journey/index';
import { commitStagedPlan } from '../onboarding/OnboardingPlan';
import { settingsStore } from '../preferences/settingsStore';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { ScreenShell } from '../ui';
export function SetupRoute() {
  const router = useRouter(),
    runtime = useRuntime(),
    journey = useJourney(runtime),
    { step } = useLocalSearchParams<{ step?: string }>(),
    userId = useSyncExternalStore((listener) => runtime.auth.subscribeIdentity(listener), () => runtime.auth.identity().userId) ?? 'guest',
    noConditions = useRulesStore((state) => state.data.rules.length === 0),
    needsStagedPlan = currentJourney().entryIntent === 'onboarding' || noConditions,
    stagedPlanCommitted = useOnboardingStore((state) => state.data.answers.ruleCommitted !== false);
  useEffect(() => {
    if (!journey.paid) {
      beginPaywall();
      router.replace('/paywall');
      return;
    }
    if (needsStagedPlan && !stagedPlanCommitted) {
      commitStagedPlan(userId, settingsStore.getState().data.units, {
        now: runtime.clock.now(),
        timezone: runtime.clock.timezone(),
      });
    }
  }, [journey.paid, needsStagedPlan, router, runtime, stagedPlanCommitted, userId]);
  const show = useCallback(
    (next: SetupStep) => {
      if (next !== step) router.setParams({ step: next });
    },
    [router, step],
  );
  const done = useCallback(() => {
    if (!finishSetup(runtime)) {
      beginPaywall();
      router.replace('/paywall');
      return;
    }
    runtime.analytics.screen('/setup/done');
    useOnboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
    router.replace('/(tabs)/home');
  }, [router, runtime]);
  if (!journey.paid || (needsStagedPlan && !stagedPlanCommitted)) return <ScreenShell>{null}</ScreenShell>;
  return <SetupFlow onDone={done} onStep={show} />;
}

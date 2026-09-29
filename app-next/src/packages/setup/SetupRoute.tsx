import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { SetupFlow, type SetupStep } from './SetupFlow';
import { beginPaywall, finishSetup } from '../journey/index';
export function SetupRoute() {
  const router = useRouter(),
    runtime = useRuntime(),
    { step } = useLocalSearchParams<{ step?: string }>();
  const show = useCallback(
    (next: SetupStep) => {
      if (next !== step) router.setParams({ step: next });
    },
    [router, step],
  );
  const done = useCallback(() => {
    if (!finishSetup(runtime)) { beginPaywall(); router.replace('/paywall'); return; }
    runtime.analytics.screen('/setup/done');
    useOnboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
    router.replace('/(tabs)/home');
  }, [router, runtime]);
  return <SetupFlow account onDone={done} onStep={show} />;
}

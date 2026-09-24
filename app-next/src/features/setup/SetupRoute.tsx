import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { SetupFlow, type SetupStep } from './SetupFlow';
/**
 * What follows the paywall: sign-in, then one screen for each permission the conditions need
 * (ADR 0043). The URL names the open screen (`/setup/motion`), so analytics sees each step, and
 * finishing reports `/setup/done` before Home opens.
 */
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
    runtime.analytics.screen('/setup/done');
    useOnboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
    router.replace('/(tabs)/home');
  }, [router, runtime]);
  return <SetupFlow account onDone={done} onStep={show} />;
}

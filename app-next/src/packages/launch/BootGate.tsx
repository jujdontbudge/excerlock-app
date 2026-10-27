import { useEffect } from 'react';
import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useHydrated } from './lib/useHydrated';
import { bootDestination } from './lib/bootDestination';
import { BootScreen } from './lib/BootScreen';
import { useRuntimeStatus } from '../lock/selectors';
import { markStartupStage } from './lib/native/startupMarks';
import { useRuntime } from '../ports/useRuntime';
import { resumeLaunch, useJourney } from '../journey/index';
import { resumeStep } from '../onboarding/onboardingPath';
export function BootGate() {
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const hydrated = useHydrated();
  const runtimeState = useRuntimeStatus();
  const saved = useOnboardingStore((s) => s.data);
  const step = resumeStep(saved);
  const setupComplete = saved.setupComplete;
  const settled = hydrated && runtimeState.hydrated && !runtimeState.loading;
  useEffect(() => {
    if (!settled || journey.phase !== 'launch') return;
    if (saved.offer) runtime.onboardingOffer?.resume(saved.offer);
    resumeLaunch(runtime, { setupComplete, step });
  }, [runtime, setupComplete, settled, journey.phase, step, saved.offer]);
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(journey.phase, step, journey.canEnterApp);
  const redirecting = settled && journey.phase !== 'launch';
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

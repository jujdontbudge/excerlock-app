import { useEffect } from 'react';
import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useHydrated } from './lib/useHydrated';
import { bootDestination } from './lib/bootDestination';
import { BootScreen } from './lib/BootScreen';
import { useRuntimeStatus } from '../lock/selectors';
import { markStartupStage } from './lib/native/startupMarks';
import { useRuntime } from '../ports/useRuntime';
import { resumeReturningAccount, useJourney, useReturningAccount } from '../journey/index';
export function BootGate() {
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const hydrated = useHydrated();
  const runtimeState = useRuntimeStatus();
  const step = useOnboardingStore((s) => s.data.step);
  const setupComplete = useOnboardingStore((s) => s.data.setupComplete);
  const returning = useReturningAccount(runtime, setupComplete);
  const settled = hydrated && runtimeState.hydrated && !runtimeState.loading;
  const resuming = settled && journey.phase === 'launch' && returning;
  useEffect(() => {
    if (resuming) resumeReturningAccount(runtime, setupComplete);
  }, [resuming, runtime, setupComplete]);
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(journey.phase, step, journey.canEnterApp);
  const redirecting = settled && !resuming && !(journey.phase === 'verifying' && !journey.error);
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

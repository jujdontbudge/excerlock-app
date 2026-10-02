import { Redirect, Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { prepareOnboardingResume } from '../onboarding/onboardingResume';
import { reportRuntimeError } from '../telemetry/reportRuntimeError';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useHydrated } from './lib/useHydrated';
import { bootDestination } from './lib/bootDestination';
import { BootScreen } from './lib/BootScreen';
import { useRuntimeStatus } from '../lock/selectors';
import { markStartupStage } from './lib/native/startupMarks';
import { useRuntime } from '../ports/useRuntime';
import { useJourney } from '../journey/index';
export function BootGate() {
  const runtime = useRuntime();
  const [prepared, setPrepared] = useState(false);
  const journey = useJourney(runtime);
  const hydrated = useHydrated();
  const runtimeState = useRuntimeStatus();
  const step = useOnboardingStore((s) => s.data.step);
  useEffect(() => {
    if (!hydrated || !runtimeState.hydrated || runtimeState.loading) return;
    let live = true;
    void prepareOnboardingResume(runtime.onboardingFlow?.order() ?? null)
      .catch(reportRuntimeError).finally(() => { if (live) setPrepared(true); });
    return () => { live = false; };
  }, [hydrated, runtimeState.hydrated, runtimeState.loading, runtime]);
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(journey.phase, step, journey.canEnterApp);
  const redirecting = prepared && hydrated && runtimeState.hydrated && !runtimeState.loading;
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

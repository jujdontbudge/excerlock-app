import { useEffect, useState } from 'react';
import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useHydrated } from './lib/useHydrated';
import { bootDestination } from './lib/bootDestination';
import { BootScreen } from './lib/BootScreen';
import { useRuntimeStatus } from '../lock/selectors';
import { markStartupStage } from './lib/native/startupMarks';
import { useRuntime } from '../ports/useRuntime';
import { beginSignIn, beginWelcome, notePurchaseRecovery, resumeReturningAccount, useJourney, useReturningAccount } from '../journey/index';
import { currentEmailChallenge } from '../identity/emailChallenge';
import { openOnboardingPaywall, resumeOnboarding } from '../onboarding/resumeOnboarding';
export function BootGate({ paywallRequested = false }: { paywallRequested?: boolean } = {}) {
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const hydrated = useHydrated();
  const runtimeState = useRuntimeStatus();
  const step = useOnboardingStore((s) => s.data.step);
  const setupComplete = useOnboardingStore((s) => s.data.setupComplete);
  const returning = useReturningAccount(runtime, setupComplete);
  const [recoveryReady, setRecoveryReady] = useState(false);
  useEffect(() => {
    let active = true;
    void runtime.subscription.recoveryReady().then(() => { if (active) setRecoveryReady(true); });
    return () => { active = false; };
  }, [runtime]);
  const settled = hydrated && runtimeState.hydrated && !runtimeState.loading && recoveryReady;
  const resuming = settled && journey.phase === 'launch' && returning;
  const challenge = settled && currentEmailChallenge(runtime.auth.identity().userId);
  const recovering = settled && journey.phase === 'launch' && Boolean(challenge || runtime.subscription.recovery().type !== 'none');
  useEffect(() => {
    if (!settled || journey.phase !== 'launch') return;
    if (challenge) beginSignIn();
    else if (resuming) resumeReturningAccount(runtime, setupComplete);
    else if (recovering) notePurchaseRecovery(runtime.subscription.recovery());
    else if (paywallRequested) openOnboardingPaywall();
    else if (setupComplete) beginWelcome();
    else resumeOnboarding();
  }, [challenge, recovering, resuming, runtime, setupComplete, settled, journey.phase, paywallRequested]);
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(journey.phase, step, journey.canEnterApp);
  const redirecting = settled && journey.phase !== 'launch' && !resuming && !recovering && !(journey.phase === 'verifying' && !journey.error);
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

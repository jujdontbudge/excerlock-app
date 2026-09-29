import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { useHydrated } from './lib/useHydrated';
import { bootDestination } from './lib/bootDestination';
import { BootScreen } from './lib/BootScreen';
import { useRuntimeStatus } from '../lock/selectors';
import { markStartupStage } from './lib/native/startupMarks';
import { useRuntime } from '../ports/useRuntime';
import { useLaunchSignIn } from '../identity/launchSignInGate';
export function BootGate() {
  const runtime = useRuntime();
  const launchApproved = useLaunchSignIn(runtime.auth);
  const hydrated = useHydrated(),
    runtimeState = useRuntimeStatus(),
    { complete, step, setupComplete } = useOnboardingStore((s) => s.data),
    { entitlement } = useEntitlementStore((s) => s.data);
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(complete, step, entitlement.status, setupComplete, launchApproved);
  const redirecting = Boolean(hydrated && runtimeState.hydrated && !runtimeState.loading && destination);
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { useHydrated } from '../../state/useHydrated';
import { bootDestination } from '../../onboarding/bootDestination';
import { BootScreen } from './BootScreen';
import { useRuntimeStatus } from '../../state/selectors';
import { markStartupStage } from './startupMarks';
export function BootGate() {
  const hydrated = useHydrated(),
    runtimeState = useRuntimeStatus(),
    { complete, step, setupComplete } = useOnboardingStore((s) => s.data),
    { entitlement } = useEntitlementStore((s) => s.data);
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(complete, step, entitlement.status, setupComplete);
  const redirecting = Boolean(hydrated && runtimeState.hydrated && !runtimeState.loading && destination);
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

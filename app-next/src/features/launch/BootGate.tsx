import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { useHydrated } from '../../state/useHydrated';
import { bootDestination } from '../../onboarding/bootDestination';
import { BootScreen } from './BootScreen';
import { useRuntimeStatus } from '../../state/selectors';
export function BootGate() {
  const hydrated = useHydrated(),
    runtimeState = useRuntimeStatus(),
    { complete, step, setupComplete, setupStep } = useOnboardingStore((s) => s.data),
    { entitlement } = useEntitlementStore((s) => s.data);
  // The research Trace Lab build exists to run one linked test on the phone, so
  // it boots straight into that test instead of production onboarding or a
  // paywall. Ordinary bundles compile this branch out.
  if (__LINKED_RECORDER_TRACE__) return <Redirect href="/linked-trace" />;
  const destination = bootDestination(complete, step, entitlement.status, setupComplete, setupStep);
  return hydrated && runtimeState.hydrated && !runtimeState.loading && destination ? <Redirect href={destination as Href} /> : <BootScreen />;
}

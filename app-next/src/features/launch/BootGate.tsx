import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { useHydrated } from '../../state/useHydrated';
import { bootDestination } from '../../onboarding/bootDestination';
import { BootScreen } from './BootScreen';
import { useDevSnapshot } from '../../state/selectors';
export function BootGate() {
  const hydrated = useHydrated(),
    runtimeState = useDevSnapshot(),
    { complete, step, setupComplete, setupStep } = useOnboardingStore((s) => s.data),
    { entitlement } = useEntitlementStore((s) => s.data);
  const destination = bootDestination(complete, step, entitlement.status, setupComplete, setupStep);
  return hydrated && runtimeState.hydrated && !runtimeState.loading && destination ? <Redirect href={destination as Href} /> : <BootScreen />;
}

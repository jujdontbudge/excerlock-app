import { Redirect, Href } from 'expo-router';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { useHydrated } from '../../state/useHydrated';
import { bootDestination } from '../../onboarding/bootDestination';
import { BootScreen } from './BootScreen';
import { useRuntimeStatus } from '../../state/selectors';
import { markStartupStage } from '../../../modules/excerlock-startup';
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
  const redirecting = Boolean(hydrated && runtimeState.hydrated && !runtimeState.loading && destination);
  // Diagnostic stage boundary: mark the commit that issues the redirect. The
  // mark cannot wait for an effect because <Redirect> navigates BootGate away
  // in that same commit; the JS wrapper is idempotent and bounds stage order.
  if (redirecting) markStartupStage('BootGateRedirect');
  return redirecting ? <Redirect href={destination as Href} /> : <BootScreen />;
}

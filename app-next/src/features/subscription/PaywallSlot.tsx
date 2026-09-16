import { useCallback, useEffect } from 'react';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { reportPaywallError, type PaywallErrorOperation } from '../../runtime/observability/paywallErrors';
import { PaywallScreen } from './PaywallScreen';
import { useRouter } from 'expo-router';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
export function PaywallSlot() {
  const runtime = useRuntime();
  const router = useRouter();
  const { setupComplete, setupStep } = useOnboardingStore((state) => state.data);
  const status = useEntitlementStore((state) => state.data.entitlement.status);
  // Stable identity: PaywallScreen reloads whenever reportError changes.
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => reportPaywallError(runtime, error, operation),
    [runtime],
  );
  useEffect(() => {
    useOnboardingStore.getState().patch({ step: 'P', complete: true });
    runtime.analytics.screen('P');
  }, [runtime]);
  useEffect(() => {
    if (status !== 'trial' && status !== 'active') return;
    router.replace(setupComplete ? '/home' : (`/setup/${setupStep}` as never));
  }, [router, setupComplete, setupStep, status]);
  return (
    <PaywallScreen
      placement={setupComplete ? 'in_app' : 'onboarding'}
      reportError={reportError}
      onClose={setupComplete ? () => (router.canGoBack() ? router.back() : router.replace('/home')) : undefined}
    />
  );
}

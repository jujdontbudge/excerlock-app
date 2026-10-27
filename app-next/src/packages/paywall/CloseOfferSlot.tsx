import { useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { onboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { admitPaid } from '../journey/index';
import { reportPaywallError, type PaywallErrorOperation } from './lib/paywallErrors';
import { leavePaywall } from './lib/leavePaywall';
import { CloseOfferScreen } from './lib/CloseOfferScreen';
export function CloseOfferSlot() {
  const runtime = useRuntime();
  const router = useRouter();
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => reportPaywallError(runtime, error, operation),
    [runtime],
  );
  useEffect(() => { runtime.analytics.screen('P'); }, [runtime]);
  const onAccess = () => {
    const setupComplete = onboardingStore.getState().data.setupComplete;
    if (!admitPaid(runtime, setupComplete)) return;
    router.replace(setupComplete ? '/(tabs)/home' : '/setup/X1');
  };
  const onLeave = useCallback(() => leavePaywall(runtime, router), [runtime, router]);
  const onFullPrice = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/paywall');
  };
  return <CloseOfferScreen onAccess={onAccess} onLeave={onLeave} onFullPrice={onFullPrice} reportError={reportError} />;
}

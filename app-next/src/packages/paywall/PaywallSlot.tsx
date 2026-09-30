import { useCallback, useEffect, useSyncExternalStore, useState } from 'react';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { reportPaywallError, type PaywallErrorOperation } from './lib/paywallErrors';
import type { PaywallVariant } from '../telemetry/PostHogAnalyticsAdapter';
import type { SubscriptionPaywall } from '../ports/SubscriptionPort';
import { PaywallScreen } from './lib/PaywallScreen';
import { useRouter } from 'expo-router';
import { useLaunchSignIn } from '../identity/launchSignInGate';
import { beginOnboarding, beginSignIn, beginWelcome, notePurchaseRecovery, verifySelectedAccount } from '../journey/index';
export function PaywallSlot() {
  const runtime = useRuntime();
  const router = useRouter();
  const signedIn = useLaunchSignIn(runtime.auth);
  const setupComplete = useOnboardingStore((state) => state.data.setupComplete);
  const placement: SubscriptionPaywall['placement'] = setupComplete && signedIn ? 'winback' : 'onboarding';
  const experiments = runtime.experiments;
  const [assignment, setAssignment] = useState<{ variant: PaywallVariant; generation: number } | null>(null);
  const [loaded, setLoaded] = useState<SubscriptionPaywall | null>(null);
  const recovery = useSyncExternalStore(
    (callback) => runtime.subscription.subscribeRecovery(callback),
    () => runtime.subscription.recovery(),
    () => runtime.subscription.recovery(),
  );
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => reportPaywallError(runtime, error, operation),
    [runtime],
  );
  useEffect(() => {
    if (!experiments) return;
    let active = true;
    const generation = runtime.auth.identity().generation;
    void experiments.getPaywallVariant().then(
      (variant) => { if (active) setAssignment({ variant, generation }); },
      () => { if (active) setAssignment({ variant: 'control', generation }); },
    );
    return () => { active = false; };
  }, [experiments, runtime]);
  useEffect(() => {
    if (!assignment || !loaded || loaded.placement !== placement) return;
    experiments?.trackPaywallVariantExposure({
      variant: assignment.variant,
      placement: loaded.placement,
      flowVariationId: loaded.flowVariationId,
      generation: assignment.generation,
    });
  }, [assignment, loaded, experiments, placement]);
  useEffect(() => { runtime.analytics.screen('P'); }, [runtime]);
  useEffect(() => {
    notePurchaseRecovery(recovery);
  }, [recovery]);
  const onAccess = async () => {
    if (!signedIn) {
      beginSignIn();
      router.replace('/sign-in');
      return;
    }
    const result = await verifySelectedAccount(runtime);
    if (result === 'paid') {
      router.replace('/setup/X1');
    }
    else if (result === 'unpaid') router.replace('/paywall');
    else router.replace('/sign-in');
  };
  const back = () => {
    if (setupComplete && signedIn) {
      beginWelcome();
      router.replace('/onboarding/O01');
    } else {
      useOnboardingStore.getState().patch({ step: 'S3d', complete: false });
      beginOnboarding();
      router.replace('/onboarding/S3d');
    }
  };
  return (
    <PaywallScreen
      placement={placement}
      variantKey={assignment?.variant ?? 'control'}
      onLoaded={setLoaded}
      reportError={reportError}
      onAccess={() => void onAccess()}
      recovery={recovery}
      onClose={setupComplete && signedIn ? back : undefined}
      onBack={setupComplete && signedIn ? undefined : back}
    />
  );
}

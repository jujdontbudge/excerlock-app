import { useCallback, useEffect, useState } from 'react';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { reportPaywallError, type PaywallErrorOperation } from '../../runtime/observability/paywallErrors';
import type { PaywallVariant } from '../../runtime/analytics/PostHogAnalyticsAdapter';
import type { SubscriptionPaywall } from '../../ports/SubscriptionPort';
import { PaywallScreen } from './PaywallScreen';
import { useRouter } from 'expo-router';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { markWinbackShown, winbackPaywallRequested } from './winbackSession';
export function PaywallSlot() {
  const runtime = useRuntime();
  const router = useRouter();
  const setupComplete = useOnboardingStore((state) => state.data.setupComplete);
  const status = useEntitlementStore((state) => state.data.entitlement.status);
  const [winback, setWinback] = useState(winbackPaywallRequested);
  const placement: SubscriptionPaywall['placement'] = winback ? 'winback' : setupComplete ? 'in_app' : 'onboarding';
  const experiments = runtime.experiments;
  const [assignment, setAssignment] = useState<{ variant: PaywallVariant; generation: number } | null>(null);
  const [loaded, setLoaded] = useState<SubscriptionPaywall | null>(null);
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => {
      reportPaywallError(runtime, error, operation);
      if (operation === 'load') setWinback((current) => (current ? false : current));
    },
    [runtime],
  );
  useEffect(() => {
    if (!experiments) return;
    let active = true;
    const generation = runtime.auth.identity().generation;
    void experiments.getPaywallVariant().then(
      (variant) => {
        if (active) setAssignment({ variant, generation });
      },
      () => {
        if (active) setAssignment({ variant: 'control', generation });
      },
    );
    return () => {
      active = false;
    };
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
  useEffect(() => {
    if (placement === 'winback') markWinbackShown();
  }, [placement]);
  const backToReminder = useCallback(() => {
    useOnboardingStore.getState().patch({ step: 'S3d', complete: false });
    router.replace('/onboarding/S3d');
  }, [router]);
  useEffect(() => {
    useOnboardingStore.getState().patch({ step: 'P', complete: true });
    runtime.analytics.screen('P');
  }, [runtime]);
  useEffect(() => {
    if (status !== 'trial' && status !== 'active') return;
    if (setupComplete) router.replace('/home');
    else {
      useOnboardingStore.getState().patch({ complete: true, setupStep: 'X1' });
      router.replace('/setup/X1');
    }
  }, [router, setupComplete, status]);
  return (
    <PaywallScreen
      placement={placement}
      variantKey={assignment?.variant ?? 'control'}
      onLoaded={setLoaded}
      reportError={reportError}
      onClose={setupComplete ? () => (router.canGoBack() ? router.back() : router.replace('/home')) : undefined}
      onBack={placement === 'onboarding' && !setupComplete ? backToReminder : undefined}
    />
  );
}

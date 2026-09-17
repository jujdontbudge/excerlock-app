import { useCallback, useEffect, useState } from 'react';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { reportPaywallError, type PaywallErrorOperation } from '../../runtime/observability/paywallErrors';
import type { PaywallVariant } from '../../runtime/analytics/PostHogAnalyticsAdapter';
import type { SubscriptionPaywall } from '../../ports/SubscriptionPort';
import { PaywallScreen } from './PaywallScreen';
import { useRouter } from 'expo-router';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
export function PaywallSlot() {
  const runtime = useRuntime();
  const router = useRouter();
  const { setupComplete, setupStep } = useOnboardingStore((state) => state.data);
  const status = useEntitlementStore((state) => state.data.entitlement.status);
  const placement = setupComplete ? 'in_app' : 'onboarding';
  const experiments = runtime.experiments;
  const [assignment, setAssignment] = useState<{ variant: PaywallVariant; generation: number } | null>(null);
  const [loaded, setLoaded] = useState<SubscriptionPaywall | null>(null);
  // Stable identity: PaywallScreen reloads whenever reportError changes.
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => reportPaywallError(runtime, error, operation),
    [runtime],
  );
  // Resolve the variant alongside the placement load so the paywall never waits
  // on PostHog: the screen paints control until (and unless) the rail answers.
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
  // Exposure exactly once per placement and identity generation: only after the
  // real paywall rendered and only for the generation the assignment belongs to.
  useEffect(() => {
    if (!assignment || !loaded) return;
    experiments?.trackPaywallVariantExposure({
      variant: assignment.variant,
      placement,
      flowVariationId: loaded.flowVariationId,
      generation: assignment.generation,
    });
  }, [assignment, loaded, experiments, placement]);
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
      placement={placement}
      variantKey={assignment?.variant ?? 'control'}
      onLoaded={setLoaded}
      reportError={reportError}
      onClose={setupComplete ? () => (router.canGoBack() ? router.back() : router.replace('/home')) : undefined}
    />
  );
}

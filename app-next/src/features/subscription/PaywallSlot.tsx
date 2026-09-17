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
  const { setupComplete, setupStep, winbackDeclined } = useOnboardingStore((state) => state.data);
  const status = useEntitlementStore((state) => state.data.entitlement.status);
  // The win-back placement is a swap on top of the placement this mount would
  // otherwise request: Home asks for it when a lapsed entitlement returns, and
  // the onboarding decline asks for it once per install.
  const [winback, setWinback] = useState(winbackPaywallRequested);
  const placement: SubscriptionPaywall['placement'] = winback
    ? 'winback'
    : setupComplete
      ? 'in_app'
      : 'onboarding';
  const experiments = runtime.experiments;
  const [assignment, setAssignment] = useState<{ variant: PaywallVariant; generation: number } | null>(null);
  const [loaded, setLoaded] = useState<SubscriptionPaywall | null>(null);
  // Stable identity: PaywallScreen reloads whenever reportError changes.
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => {
      reportPaywallError(runtime, error, operation);
      // The swap is a one-shot offer: a win-back placement that cannot load
      // falls back to the paywall this surface would have shown without it,
      // instead of leaving the user on an error wall.
      if (operation === 'load') setWinback((current) => (current ? false : current));
    },
    [runtime],
  );
  const decline = useCallback(() => {
    useOnboardingStore.getState().patch({ winbackDeclined: true });
    setWinback(true);
  }, []);
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
  // real paywall rendered, only for the generation the assignment belongs to,
  // and only for the placement that actually loaded, so a swap mid-mount cannot
  // re-expose the previous placement's flow under the new placement's name.
  useEffect(() => {
    if (!assignment || !loaded || loaded.placement !== placement) return;
    experiments?.trackPaywallVariantExposure({
      variant: assignment.variant,
      placement: loaded.placement,
      flowVariationId: loaded.flowVariationId,
      generation: assignment.generation,
    });
  }, [assignment, loaded, experiments, placement]);
  // Presenting the win-back paywall spends the session request and marks the
  // session, so Home does not route back to it after the user dismisses it.
  useEffect(() => {
    if (placement === 'winback') markWinbackShown();
  }, [placement]);
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
      /* The decline rule: only the onboarding placement without a close action,
         and only until this install has spent its one decline. */
      onDecline={placement === 'onboarding' && !winbackDeclined ? decline : undefined}
      onClose={setupComplete ? () => (router.canGoBack() ? router.back() : router.replace('/home')) : undefined}
    />
  );
}

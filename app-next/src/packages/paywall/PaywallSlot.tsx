import { useCallback, useEffect, useState } from 'react';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { useRuntime } from '../ports/useRuntime';
import { reportPaywallError, type PaywallErrorOperation } from './lib/paywallErrors';
import type { PaywallVariant } from '../telemetry/PostHogAnalyticsAdapter';
import type { SubscriptionPaywall } from '../ports/SubscriptionPort';
import { PaywallScreen } from './lib/PaywallScreen';
import { useRouter } from 'expo-router';
import { admitPaid, beginOnboarding, beginWelcome } from '../journey/index';
export function PaywallSlot() {
  const runtime = useRuntime();
  const router = useRouter();
  const setupComplete = useOnboardingStore((state) => state.data.setupComplete);
  const placement: SubscriptionPaywall['placement'] = setupComplete ? 'winback' : 'onboarding';
  const experiments = runtime.experiments;
  const [assignment, setAssignment] = useState<{ variant: PaywallVariant; generation: number } | null>(null);
  const [loaded, setLoaded] = useState<SubscriptionPaywall | null>(null);
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
  const onAccess = () => {
    if (!admitPaid(runtime, setupComplete)) return;
    router.replace(setupComplete ? '/(tabs)/home' : '/setup/X1');
  };
  const back = () => {
    const answeredOnboarding = Object.keys(useOnboardingStore.getState().data.answers).length > 0;
    if (setupComplete || !answeredOnboarding) {
      beginWelcome();
      router.replace('/onboarding/O01');
      return;
    }
    const step = runtime.onboardingOffer?.snapshot().trialAvailable === false ? 'S3e' : 'S3d';
    useOnboardingStore.getState().patch({ step, complete: false });
    beginOnboarding();
    router.replace(`/onboarding/${step}`);
  };
  return (
    <PaywallScreen
      placement={placement}
      variantKey={assignment?.variant ?? 'control'}
      onLoaded={setLoaded}
      reportError={reportError}
      onAccess={onAccess}
      onClose={back}
      onNoPurchase={() => router.push('/recovery')}
    />
  );
}

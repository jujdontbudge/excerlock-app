import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PaywallScreen, type PaywallFixtureOverlay, type PaywallPlan } from '@/features/paywall';
import { useDemo } from '@/presentation';

const plans: readonly PaywallPlan[] = ['annual', 'monthly'];
const fixtureOverlays: readonly PaywallFixtureOverlay[] = ['purchase', 'loading', 'success', 'failure'];

export default function PaywallRoute() {
  const { fixture, plan } = useLocalSearchParams<{ fixture?: string; plan?: string }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const requestedPlan = plans.includes(plan as PaywallPlan)
    ? plan as PaywallPlan
    : null;
  const initializedPlanRef = useRef(false);
  const selectedPlan = initializedPlanRef.current
    ? state.selectedPlan ?? requestedPlan ?? 'annual'
    : requestedPlan ?? state.selectedPlan ?? 'annual';
  const fixtureOverlay = fixtureOverlays.includes(fixture as PaywallFixtureOverlay)
    ? fixture as PaywallFixtureOverlay
    : undefined;

  useEffect(() => {
    if (initializedPlanRef.current) return;
    initializedPlanRef.current = true;
    if (requestedPlan && state.selectedPlan !== requestedPlan) {
      dispatch({ type: 'paywall/select-plan', plan: requestedPlan });
    }
  }, [dispatch, requestedPlan, state.selectedPlan]);

  return (
    <PaywallScreen
      fixtureOverlay={fixtureOverlay}
      onOpenLegal={(document) => router.push(`/legal/${document}`)}
      onPurchaseComplete={(purchasedPlan) => {
        dispatch({ type: 'paywall/purchase-succeeded', plan: purchasedPlan });
        router.replace('/signup?mode=postPurchase');
      }}
      onRestoreComplete={() => {
        dispatch({ type: 'settings/set-subscription', status: 'active' });
        router.replace(
          state.account.status === 'signedInDemo'
            ? '/(tabs)/home'
            : '/signup?mode=recovery',
        );
      }}
      onSelectPlan={(plan) => dispatch({ type: 'paywall/select-plan', plan })}
      selectedPlan={selectedPlan}
    />
  );
}

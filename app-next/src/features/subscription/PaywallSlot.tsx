import { useEffect, useRef, useState } from 'react';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { tokens as t } from '../../design-system/tokens';
import { subscriptionCopy as c } from '../../content/subscription';
import { PaywallStandIn } from './PaywallStandIn';
import { entitlementAccess } from '../../domain/entitlementAccess';
import { useRouter } from 'expo-router';
import { SubscriptionPlan } from '../../ports/SubscriptionPort';
import { requestFailureMessage } from '../../runtime/requestFailureMessage';
import { common } from '../../content/common';
import { paywallPresence } from '../../adapters/notifications/presentation';
export function PaywallSlot() {
  const runtime = useRuntime(),
    router = useRouter(),
    status = useEntitlementStore((s) => s.data.entitlement.status),
    setupComplete = useOnboardingStore((s) => s.data.setupComplete),
    [selected, setSelected] = useState<SubscriptionPlan>('annual'),
    [busy, setBusy] = useState<'purchase' | 'restore' | null>(null),
    [error, setError] = useState(''),
    running = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    useOnboardingStore.getState().patch({ step: 'P', complete: true });
    runtime.analytics.screen('P');
    // The foreground notification handler suppresses the trial reminder while this screen is up.
    paywallPresence.open();
    return () => {
      mounted.current = false;
      paywallPresence.close();
    };
  }, [runtime]);
  const run = async (kind: 'purchase' | 'restore', immediate = false) => {
    if (running.current) return;
    running.current = true;
    setBusy(kind);
    setError('');
    try {
      // The stand-in's own busy state stands in for a purchase sheet. A Builder build has a real one
      // to open, so waiting first would only delay it.
      if (!immediate) await new Promise((resolve) => setTimeout(resolve, t.motion.duration.purchase));
      if (!mounted.current) return;
      const next =
        kind === 'purchase'
          ? await runtime.subscription.presentPaywall(setupComplete ? 'in_app' : 'onboarding', selected)
          : await runtime.subscription.restore();
      if (!['trial', 'active'].includes(next.status)) setError(kind === 'restore' ? c.notFound : c.cancelled);
    } catch {
      const message = await requestFailureMessage(runtime.reachability, { offline: common.offline, fallback: c.error });
      if (mounted.current) setError(message);
    } finally {
      running.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const opened = useRef(false);
  useEffect(() => {
    // A Builder build has a paywall designed in the dashboard, so the screen opens it rather than
    // waiting for a tap on a stand-in. Once per screen, never once per render: a dismissal that
    // bought nothing falls back to the stand-in below, whose action re-presents. Re-presenting on
    // dismissal here instead would loop forever the moment a fetch failed.
    if (runtime.paywall !== 'builder' || opened.current) return;
    opened.current = true;
    void run('purchase', true);
    // `run` closes over the selected plan and the setup flag, both of which are correct on mount:
    // this effect is the screen's own opening, not a reaction to either changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime]);
  const banner = status === 'expired' ? c.expired : status === 'billingIssue' ? c.billingIssue : '';
  return (
    <PaywallStandIn
      selected={selected}
      onSelect={setSelected}
      busy={busy}
      message={error || banner}
      onStart={() => run('purchase')}
      onRestore={() => run('restore')}
      onClose={
        entitlementAccess(status).paywall === 'modal' ? () => router.replace('/(tabs)/home') : undefined
      }
    />
  );
}

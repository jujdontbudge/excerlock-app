import { useEffect, useRef, useState } from 'react';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { tokens as t } from '../../design-system/tokens';
import { subscriptionCopy as c } from '../../content/subscription';
import { PaywallStandIn } from './PaywallStandIn';
export function PaywallSlot() {
  const runtime = useRuntime(),
    status = useEntitlementStore((s) => s.data.entitlement.status),
    setupComplete = useOnboardingStore((s) => s.data.setupComplete),
    [selected, setSelected] = useState('annual'),
    [busy, setBusy] = useState<'purchase' | 'restore' | null>(null),
    [error, setError] = useState(''),
    running = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    useOnboardingStore.getState().patch({ step: 'P', complete: true });
    runtime.analytics.screen('P');
    return () => {
      mounted.current = false;
    };
  }, [runtime]);
  const run = async (kind: 'purchase' | 'restore') => {
    if (running.current) return;
    running.current = true;
    setBusy(kind);
    setError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, t.motion.duration.purchase));
      if (!mounted.current) return;
      const next =
        kind === 'purchase'
          ? await runtime.subscription.presentPaywall(setupComplete ? 'in_app' : 'onboarding')
          : await runtime.subscription.restore();
      if (!['trial', 'active'].includes(next.status)) setError(kind === 'restore' ? c.notFound : c.cancelled);
    } catch {
      if (mounted.current) setError(c.error);
    } finally {
      running.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const banner = status === 'expired' ? c.expired : status === 'billingIssue' ? c.billingIssue : '';
  return (
    <PaywallStandIn
      selected={selected}
      onSelect={setSelected}
      busy={busy}
      message={error || banner}
      onStart={() => run('purchase')}
      onRestore={() => run('restore')}
    />
  );
}

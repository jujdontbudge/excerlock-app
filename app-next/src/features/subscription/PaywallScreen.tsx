import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import {
  ChoiceRow,
  CloseButton,
  Heading,
  Label,
  PrimaryButton,
  ScreenShell,
  SecondaryButton,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import type { SubscriptionPaywall } from '../../ports/SubscriptionPort';
import type { PaywallErrorOperation } from '../../runtime/observability/paywallErrors';
import type { PaywallVariant } from '../../runtime/analytics/PostHogAnalyticsAdapter';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { subscriptionCopy } from '../../content/subscription';
import { defaultPlanHandle } from './paywallVariant';
const TERMS_URL = 'https://excerlock.com/terms';
const PRIVACY_URL = 'https://excerlock.com/privacy';
export function PaywallScreen({
  placement,
  reportError,
  variantKey = 'control',
  onClose,
  onLoaded,
}: {
  placement: SubscriptionPaywall['placement'];
  reportError: (error: unknown, operation: PaywallErrorOperation) => void;
  /** B7 UI variation; `control` leaves the remote catalog order in charge. */
  variantKey?: PaywallVariant;
  onClose?: () => void;
  /** Reports the mounted placement so the slot can expose the variant it rendered. */
  onLoaded?: (paywall: SubscriptionPaywall) => void;
}) {
  const runtime = useRuntime(),
    status = useEntitlementStore((state) => state.data.entitlement.status),
    [paywall, setPaywall] = useState<SubscriptionPaywall | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState<'load' | 'purchase' | 'restore' | null>('load'),
    [message, setMessage] = useState(''),
    chosen = useRef(false),
    latest = useRef({ variantKey, onLoaded }),
    shown = useRef<number | null>(null);
  // Read by the loader without joining its dependencies: a variant that answers
  // late must not reload the placement, because a second load is a new flow
  // variation (and therefore a second exposure for one mounted surface).
  useEffect(() => {
    latest.current = { variantKey, onLoaded };
  }, [variantKey, onLoaded]);
  const load = useCallback(async () => {
    setBusy('load');
    setMessage('');
    try {
      const next = await runtime.subscription.loadPaywall(placement);
      setPaywall(next);
      setSelected(defaultPlanHandle(next.products, latest.current.variantKey));
      latest.current.onLoaded?.(next);
      runtime.analytics.track('paywall_viewed', {
        placement,
        has_trial: next.products.some((item) => item.offerLabel !== null),
        variation_id: next.flowVariationId || undefined,
      });
    } catch (error) {
      reportError(error, 'load');
      setMessage("Plans couldn't load. Please retry.");
    } finally {
      setBusy(null);
    }
  }, [placement, reportError, runtime]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  // A variant that answers after the placement load still takes effect while the
  // user has not chosen a plan, so the rendered surface always matches the
  // exposure the slot reports for it.
  useEffect(() => {
    if (!paywall || chosen.current) return;
    setSelected(defaultPlanHandle(paywall.products, variantKey));
  }, [paywall, variantKey]);
  useEffect(() => {
    if (!paywall || shown.current === paywall.generation) return;
    shown.current = paywall.generation;
    void runtime.subscription.logPaywallShown(paywall.generation);
  }, [paywall, runtime]);
  const purchase = async () => {
    if (!selected || busy) return;
    if (product) runtime.analytics.track('purchase_started', { placement, plan_id: product.vendorProductId });
    setBusy('purchase');
    setMessage('');
    try {
      const result = await runtime.subscription.purchase(selected);
      if (result.type === 'pending') setMessage('Your purchase is pending approval. Access will update when approved.');
      else if (result.type === 'user_cancelled') setMessage('Choose a plan to continue.');
    } catch (error) {
      reportError(error, 'purchase');
      setMessage('Purchase could not finish. Please retry.');
    } finally {
      setBusy(null);
    }
  };
  const restore = async () => {
    if (busy) return;
    setBusy('restore');
    setMessage('');
    try {
      const result = await runtime.subscription.restore();
      if (!['trial', 'active'].includes(result.status)) setMessage('No active purchase was found.');
    } catch (error) {
      reportError(error, 'restore');
      setMessage('Restore could not finish. Please retry.');
    } finally {
      setBusy(null);
    }
  };
  const product = paywall?.products.find((item) => item.handle === selected);
  return (
    <ScreenShell
      header={
        onClose ? (
          <View style={{ paddingHorizontal: t.layout.page }}>
            <CloseButton label="Close" onPress={onClose} />
          </View>
        ) : undefined
      }
      footer={
        <>
          <PrimaryButton
            label={product?.offerLabel ? 'Start free trial' : 'Continue'}
            loading={busy === 'purchase'}
            disabled={!product || busy === 'restore' || busy === 'load'}
            onPress={() => void purchase()}
          />
          <SecondaryButton
            label="Restore purchases"
            disabled={busy !== null}
            variant="tertiary"
            onPress={() => void restore()}
          />
        </>
      }>
      <Heading
        title={paywall?.title ?? 'Choose your plan'}
        support={paywall?.body || 'Build a healthier relationship with your phone.'}
      />
      {message || status === 'expired' || status === 'billingIssue' ? (
        <Label accessibilityRole="alert" style={{ color: t.state.error }}>
          {message || (status === 'expired' ? subscriptionCopy.expired : subscriptionCopy.billingIssue)}
        </Label>
      ) : null}
      {busy === 'purchase' || busy === 'restore' ? (
        <Label accessibilityRole="alert" tone="secondary">
          {busy === 'purchase' ? subscriptionCopy.purchasing : subscriptionCopy.restoring}
        </Label>
      ) : null}
      {!paywall && busy !== 'load' ? <PrimaryButton label="Retry loading plans" onPress={() => void load()} /> : null}
      {paywall?.products.map((item) => (
        <ChoiceRow
          key={item.handle}
          title={item.title}
          support={`${item.localizedPrice} / ${item.localizedPeriod}${item.offerLabel ? ` · ${item.offerLabel}` : ''}`}
          selected={selected === item.handle}
          recommended={item.recommended}
          onPress={() => {
            if (!busy) {
              chosen.current = true;
              setSelected(item.handle);
            }
          }}
        />
      ))}
      {product ? (
        <Label tone="secondary">
          {product.offerLabel ? `${product.offerLabel}, then ` : ''}
          {product.localizedPrice} per {product.localizedPeriod}. Subscription renews automatically until canceled.
        </Label>
      ) : null}
      <SecondaryButton label="Terms of Use" variant="tertiary" onPress={() => void Linking.openURL(TERMS_URL)} />
      <SecondaryButton label="Privacy Policy" variant="tertiary" onPress={() => void Linking.openURL(PRIVACY_URL)} />
    </ScreenShell>
  );
}

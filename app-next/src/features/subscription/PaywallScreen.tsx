import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { ChoiceRow, CloseButton, Heading, Label, PrimaryButton, ScreenShell, SecondaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { Reveal } from '../../motion/Reveal';
import { welcomeTokens as w } from '../../design-system/welcomeTokens';
import type { SubscriptionPaywall } from '../../ports/SubscriptionPort';
import type { PaywallErrorOperation } from '../../runtime/observability/paywallErrors';
import type { PaywallVariant } from '../../runtime/analytics/PostHogAnalyticsAdapter';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { subscriptionCopy, priceFirstFooterLabel, planRowTitle } from '../../content/subscription';
import { defaultPlanHandle } from './paywallVariant';
const TERMS_URL = 'https://excerlock.com/terms';
const PRIVACY_URL = 'https://excerlock.com/privacy';
export function PaywallScreen({
  placement,
  reportError,
  variantKey = 'control',
  onClose,
  onDecline,
  onLoaded,
}: {
  placement: SubscriptionPaywall['placement'];
  reportError: (error: unknown, operation: PaywallErrorOperation) => void;
  /** B7 UI variation; `control` leaves the remote catalog order in charge. */
  variantKey?: PaywallVariant;
  onClose?: () => void;
  /**
   * The onboarding hard wall cannot be closed, so the slot supplies an explicit
   * decline here; it hands the user the win-back offer instead of leaving.
   */
  onDecline?: () => void;
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
          {product ? (
            <Label variant="support" style={{ textAlign: 'center' }}>
              {priceFirstFooterLabel(product)}
            </Label>
          ) : null}
          <PrimaryButton
            label={product?.offerLabel ? 'Start free trial' : 'Continue'}
            loading={busy === 'purchase'}
            disabled={!product || busy === 'restore' || busy === 'load'}
            onPress={() => void purchase()}
          />
          {/* The onboarding decline is a quiet outlined button under the CTA, never
              orange text, and disabled while a store call is in flight. */}
          {onDecline ? (
            <SecondaryButton label={subscriptionCopy.decline} disabled={busy !== null} onPress={onDecline} />
          ) : null}
          {/* One quiet row of legal links under the button, as every reference paywall does. */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space.lg }}>
            <Label
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
              accessibilityState={{ disabled: busy !== null }}
              onPress={() => {
                if (busy === null) void restore();
              }}
              style={{ ...w.type.legal, color: t.text.muted }}>
              Restore purchases
            </Label>
            <Label style={{ ...w.type.legal, color: t.text.muted }}>·</Label>
            <Label
              accessibilityRole="button"
              accessibilityLabel="Terms of Use"
              onPress={() => void Linking.openURL(TERMS_URL)}
              style={{ ...w.type.legal, color: t.text.muted }}>
              Terms of Use
            </Label>
            <Label style={{ ...w.type.legal, color: t.text.muted }}>·</Label>
            <Label
              accessibilityRole="button"
              accessibilityLabel="Privacy Policy"
              onPress={() => void Linking.openURL(PRIVACY_URL)}
              style={{ ...w.type.legal, color: t.text.muted }}>
              Privacy Policy
            </Label>
          </View>
        </>
      }>
      <Heading title={paywall?.title ?? 'Choose your plan'} variant="hero" centered />
      <View style={{ gap: t.space.md }}>
        {subscriptionCopy.benefits.map((b, index) => (
          <Reveal key={b.text} index={index + 1} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.lg }}>
            <Icon name={b.icon} size={t.layout.glyph} tint={t.brand.primary} variant="utility" />
            <Label variant="label" style={{ flex: 1 }}>
              {b.text}
            </Label>
          </Reveal>
        ))}
      </View>
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
      {/* Plans sit just above the button; the benefits keep the top. */}
      <View style={{ flex: 1 }} />
      {paywall?.products.map((item) => (
        <ChoiceRow
          key={item.handle}
          title={planRowTitle(item)}
          support={item.offerLabel ?? undefined}
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
    </ScreenShell>
  );
}

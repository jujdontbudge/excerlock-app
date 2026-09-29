import { restorePurchases } from '../../subscription/restorePurchases';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton, CloseButton, Label, PressableScale, PrimaryButton, ScreenShell } from '../../ui';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';
import { Icon } from '../../ui/Icon';
import { Reveal } from '../../ui/Reveal';
import type { PaywallProduct, SubscriptionPaywall } from '../../ports/SubscriptionPort';
import type { PaywallErrorOperation } from './paywallErrors';
import type { PaywallVariant } from '../../telemetry/PostHogAnalyticsAdapter';
import { useRuntime } from '../../ports/useRuntime';
import { entitlementStore as useEntitlementStore } from '../../subscription/entitlementStore';
import { subscriptionCopy, planRowTitle, planName, perMonth } from '../../subscription/subscriptionCopy';
import { onboardingStore as useOnboardingStore } from '../../onboarding/onboardingStore';
import { rulesStore as useRulesStore } from '../../conditions/rulesStore';
import { defaultPlanHandle } from './paywallVariant';
import { paywallPromises } from './paywallPromises';
import { PaywallHero } from './PaywallHero';
import { paywallCopy as copy } from './paywallCopy';
export function PaywallScreen({
  placement,
  reportError,
  variantKey = 'control',
  onClose,
  onBack,
  onLoaded,
}: {
  placement: SubscriptionPaywall['placement'];
  reportError: (error: unknown, operation: PaywallErrorOperation) => void;
  variantKey?: PaywallVariant;
  onClose?: () => void;
  onBack?: () => void;
  onLoaded?: (paywall: SubscriptionPaywall) => void;
}) {
  const runtime = useRuntime(),
    status = useEntitlementStore((state) => state.data.entitlement.status),
    answers = useOnboardingStore((state) => state.data.answers),
    rule = useRulesStore((state) => state.data.rules[0]),
    [paywall, setPaywall] = useState<SubscriptionPaywall | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState<'load' | 'purchase' | 'restore' | null>('load'),
    [message, setMessage] = useState(''),
    chosen = useRef(false),
    latest = useRef({ variantKey, onLoaded }),
    shown = useRef<number | null>(null);
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
      else if (result.type === 'user_cancelled') {
        runtime.analytics.track('purchase_failed', { reason_class: 'cancelled' });
        setMessage('Choose a plan to continue.');
      }
    } catch (error) {
      runtime.analytics.track('purchase_failed', { reason_class: 'unknown' });
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
      if ((await restorePurchases(runtime.subscription, runtime.analytics)) === 'notFound') setMessage('No active purchase was found.');
    } catch (error) {
      reportError(error, 'restore');
      setMessage('Restore could not finish. Please retry.');
    } finally {
      setBusy(null);
    }
  };
  const product = paywall?.products.find((item) => item.handle === selected);
  const choose = (handle: string) => {
    if (busy) return;
    chosen.current = true;
    setSelected(handle);
  };
  return (
    <ScreenShell
      contentStyle={{ gap: t.space.md, paddingTop: 0 }}
      header={
        <View
          style={{
            paddingHorizontal: t.layout.page,
            height: placement === 'onboarding' ? t.type.display.lineHeight * 2 : t.layout.header,
          }}>
          <View style={{
            height: placement === 'onboarding' ? t.type.display.lineHeight : t.layout.header,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{ width: t.control.full }}>
              {onClose ? (
                <CloseButton label="Close" onPress={onClose} />
              ) : onBack ? (
                <BackButton onPress={onBack} />
              ) : null}
            </View>
            {placement === 'onboarding' ? (
              <Label accessibilityRole="header" accessibilityLabel={copy.title} variant="display" style={{ flex: 1, textAlign: 'center' }}>
                {copy.before.trim()}
              </Label>
            ) : <View style={{ flex: 1 }} />}
            <View style={{ width: t.control.full, alignItems: 'flex-end' }}>
              <PressableScale
                label={subscriptionCopy.restore}
                accessibilityState={{ disabled: busy !== null }}
                onPress={() => {
                  if (busy === null) void restore();
                }}>
                <Label variant="support" tone="secondary">
                  {subscriptionCopy.restoreShort}
                </Label>
              </PressableScale>
            </View>
          </View>
          {placement === 'onboarding' ? (
            <Label accessible={false} variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center', paddingRight: t.space.xxl }}>
              <Label variant="display" style={{ color: t.brand.primary }}>{copy.emphasis}</Label>
              {copy.after}
            </Label>
          ) : null}
        </View>
      }
      footer={
        <>
          {product?.offerLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm }}>
              <Icon name="check" size={t.icon.md} variant="utility" />
              <Label variant="label">{subscriptionCopy.noPayment}</Label>
            </View>
          ) : null}
          {paywall ? (
            <View style={{ flexDirection: 'row', gap: t.space.md, paddingTop: t.space.md }}>
              {paywall.products.map((item, index) => (
                <Reveal key={item.handle} index={index + 4} style={{ flex: 1 }}>
                  <PlanCard product={item} selected={selected === item.handle} onPress={() => choose(item.handle)} />
                </Reveal>
              ))}
            </View>
          ) : null}
          <PrimaryButton
            label={product?.offerLabel ? subscriptionCopy.start : 'Continue'}
            loading={busy === 'purchase'}
            disabled={!product || busy === 'restore' || busy === 'load'}
            onPress={() => void purchase()}
          />
        </>
      }>
      {rule ? <PaywallHero rule={rule} /> : <View style={{ flex: 1 }} />}
      <View style={{ gap: t.space.sm, alignItems: 'center', marginBottom: -t.space.md }}>
        {paywallPromises(answers).map((promise, index) => (
          <Reveal
            key={promise}
            index={index + 1}
            style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            <View
              style={{
                width: t.icon.md,
                height: t.icon.md,
                borderRadius: t.radius.pill,
                backgroundColor: t.brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="check" size={t.icon.sm} tone="onAccent" variant="utility" />
            </View>
            <Label variant="body" style={{ flexShrink: 1, textAlign: 'center' }}>
              {promise}
            </Label>
          </Reveal>
        ))}
      </View>
      {message || status === 'expired' || status === 'billingIssue' ? (
        <Label accessibilityRole="alert" style={{ color: t.state.error, textAlign: 'center' }}>
          {message || (status === 'expired' ? subscriptionCopy.expired : subscriptionCopy.billingIssue)}
        </Label>
      ) : null}
      {busy ? (
        <Label accessibilityRole="alert" tone="secondary" style={{ textAlign: 'center' }}>
          {busy === 'purchase' ? subscriptionCopy.purchasing : busy === 'restore' ? subscriptionCopy.restoring : subscriptionCopy.loadingPlans}
        </Label>
      ) : null}
      {!paywall && busy !== 'load' ? <PrimaryButton label="Retry loading plans" onPress={() => void load()} /> : null}
    </ScreenShell>
  );
}

function PlanCard({ product, selected, onPress }: { product: PaywallProduct; selected: boolean; onPress: () => void }) {
  const m = useMotion(),
    ink = selected ? t.text.onAccent : t.text.primary,
    price = product.localizedMonthlyPrice
      ? perMonth(product.localizedMonthlyPrice)
      : `${product.localizedPrice} / ${product.localizedPeriod}`;
  return (
    <PressableScale
      label={planRowTitle(product)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}>
      <Animated.View
        style={{
          alignItems: 'center',
          paddingVertical: t.space.md,
          paddingHorizontal: t.space.lg,
          borderRadius: t.radius.card,
          borderWidth: selected ? t.stroke.selected : t.stroke.hairline,
          borderColor: selected ? t.brand.primary : t.border.outline,
          backgroundColor: selected ? t.brand.primary : t.surface.card,
          ...m.transition(['borderColor', 'backgroundColor'], 'standard'),
        }}>
        <Label variant="body" style={{ color: ink, textAlign: 'center' }}>
          {planName(product)}
        </Label>
        <Label variant="label" style={{ color: ink, textAlign: 'center' }}>
          {price}
        </Label>
      </Animated.View>
      {product.offerLabel ? (
        <View style={{ position: 'absolute', top: -t.space.md, left: 0, right: 0, alignItems: 'center' }}>
          <View
            style={{
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.xs,
              borderRadius: t.radius.pill,
              backgroundColor: t.text.primary,
            }}>
            <Label variant="micro" style={{ color: t.text.onAccent }}>
              {subscriptionCopy.trialBadge(product.offerLabel)}
            </Label>
          </View>
        </View>
      ) : null}
    </PressableScale>
  );
}

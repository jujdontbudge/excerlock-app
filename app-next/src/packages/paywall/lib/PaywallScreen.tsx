import { restorePurchases } from '../../subscription/restorePurchases';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseButton, Label, PressableScale, PrimaryButton, ScreenShell } from '../../ui';
import { notify } from '../../ui/Notice';
import { useMotion } from '../../ui/useMotion';
import { haptic } from '../../ui/haptics';
import { tokens as t } from '../../ui/tokens';
import { Reveal } from '../../ui/Reveal';
import type { PaywallProduct, SubscriptionPaywall } from '../../ports/SubscriptionPort';
import type { Entitlement } from '../../model/types';
import { eligible } from '../../journey/index';
import type { PaywallErrorOperation } from './paywallErrors';
import type { PaywallVariant } from '../../telemetry/PostHogAnalyticsAdapter';
import { useRuntime } from '../../ports/useRuntime';
import { subscriptionCopy, planName, perPeriod } from '../../subscription/subscriptionCopy';
import { defaultPlanHandle } from './paywallVariant';
import { PaywallHeadline } from './PaywallHeadline';
import { PaywallReview } from './PaywallReview';
import { PaywallTagline } from './PaywallTagline';
import { offeredHandle, offersTrial, planFor, planPairs, trialLength } from './paywallPlans';
import { paywallCopy as copy } from './paywallCopy';
const paywallLoadRetries = 2,
  planRowHeight = t.control.full;
export function PaywallScreen({
  placement,
  reportError,
  variantKey = 'control',
  onClose,
  onAccount,
  onLoaded,
  onAccess,
}: {
  placement: SubscriptionPaywall['placement'];
  reportError: (error: unknown, operation: PaywallErrorOperation) => void;
  variantKey?: PaywallVariant;
  onClose?: () => void;
  onAccount?: () => void;
  onLoaded?: (paywall: SubscriptionPaywall) => void;
  onAccess?: (entitlement: Entitlement) => void;
}) {
  const runtime = useRuntime(),
    insets = useSafeAreaInsets(),
    linksSpace = insets.bottom + t.space.xs - t.type.micro.lineHeight,
    [paywall, setPaywall] = useState<SubscriptionPaywall | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState<'load' | 'purchase' | 'restore' | null>('load'),
    chosen = useRef(false),
    operationInFlight = useRef(false),
    latest = useRef({ variantKey, onLoaded }),
    shown = useRef<number | null>(null);
  useEffect(() => {
    latest.current = { variantKey, onLoaded };
  }, [variantKey, onLoaded]);
  const load = useCallback(async (): Promise<void> => {
    setBusy('load');
    for (let attempt = 0; ; attempt++) {
      try {
        const next = placement === 'onboarding' && runtime.onboardingOffer
          ? await runtime.onboardingOffer.loadPaywall()
          : await runtime.subscription.loadPaywall(placement);
        setPaywall(next);
        setSelected(offeredHandle(next, defaultPlanHandle(next.products, latest.current.variantKey)));
        latest.current.onLoaded?.(next);
        runtime.analytics.track('paywall_viewed', {
          placement,
          has_trial: next.products.some((item) => item.offerLabel !== null),
          variation_id: next.flowVariationId || undefined,
          ...(placement === 'onboarding' ? { offer_arm: runtime.onboardingOffer?.snapshot().arm ?? 'a', offer_source: runtime.onboardingOffer?.snapshot().source ?? 'fallback' } : {}),
        });
        runtime.adAttribution.paywallViewed();
        break;
      } catch (error) {
        reportError(error, 'load');
        if (attempt >= paywallLoadRetries) break;
        await new Promise((resolve) => setTimeout(resolve, t.motion.hold.notice));
      }
    }
    setBusy(null);
  }, [placement, reportError, runtime]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!paywall || chosen.current) return;
    setSelected(offeredHandle(paywall, defaultPlanHandle(paywall.products, variantKey)));
  }, [paywall, variantKey]);
  useEffect(() => {
    if (!paywall || shown.current === paywall.generation) return;
    shown.current = paywall.generation;
    void runtime.subscription.logPaywallShown(paywall.generation).catch((error) => reportError(error, 'load'));
    if (placement === 'onboarding') runtime.onboardingOffer?.expose();
  }, [paywall, runtime, placement, reportError]);
  const purchase = async () => {
    if (!selected || busy || operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy('purchase');
    let restoreExisting = false;
    try {
      const result = await runtime.subscription.purchase(selected);
      if (result.type === 'success') {
        const entitlement = eligible(result.entitlement, Date.parse(runtime.clock.now()))
          ? result.entitlement
          : await runtime.subscription.refresh();
        if (eligible(entitlement, Date.parse(runtime.clock.now()))) {
          haptic('success');
          onAccess?.(entitlement);
        } else restoreExisting = true;
      } else if (result.type === 'pending') notify(subscriptionCopy.awaitingApproval);
      else if (result.type === 'already_subscribed') restoreExisting = true;
    } catch (error) {
      reportError(error, 'purchase');
      notify(subscriptionCopy.error);
      haptic('error');
    } finally {
      operationInFlight.current = false;
      setBusy(null);
    }
    if (restoreExisting) await restore();
  };
  async function restore() {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy('restore');
    try {
      if ((await restorePurchases(runtime.subscription, placement)) === 'notFound')
        notify(subscriptionCopy.notFound);
      else {
        haptic('success');
        onAccess?.(runtime.subscription.entitlement());
      }
    } catch (error) {
      reportError(error, 'restore');
      notify(subscriptionCopy.error);
      haptic('error');
    } finally {
      operationInFlight.current = false;
      setBusy(null);
    }
  }
  const product = paywall?.products.find((item) => item.handle === selected);
  const press = () => {
    if (busy || operationInFlight.current) return;
    if (!paywall) void load();
    else void purchase();
  };
  const choose = (handle: string) => {
    if (busy === 'purchase' || busy === 'restore') return;
    chosen.current = true;
    setSelected(handle);
  };
  const pairs = useMemo(() => planPairs(paywall?.products ?? []), [paywall]),
    trial = paywall ? offersTrial(paywall) : false;
  return (
    <ScreenShell
      scrollResetKey={paywall ? 'plans' : 'loading'}
      contentStyle={{ gap: t.space.xl, paddingTop: onClose ? 0 : insets.top + t.space.xl }}
      header={
        onClose ? (
          <View
            style={{
              paddingHorizontal: t.layout.page,
              height: t.layout.header,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: onAccount ? 'space-between' : 'flex-end',
            }}>
            {onAccount ? (
              <PressableScale label={copy.account} onPress={onAccount}>
                <Label variant="support" tone="secondary">
                  {copy.account}
                </Label>
              </PressableScale>
            ) : null}
            <CloseButton label="Close" onPress={onClose} />
          </View>
        ) : undefined
      }
      footer={
        <>
          <View style={{ gap: t.space.md, paddingBottom: t.space.sm }}>
          <View style={{ gap: t.space.md, minHeight: planRowHeight * 2 + t.space.md }}>
            {pairs.map((pair, index) => {
              const item = planFor(pair, trial);
              return (
                <Reveal key={pair.period} index={index + 3}>
                  <PlanRow
                    product={item}
                    selected={selected === item.handle}
                    locked={busy !== null}
                    onPress={() => choose(item.handle)}
                  />
                </Reveal>
              );
            })}
          </View>
          {product ? (
            <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
              {product.offerLabel
                ? copy.trialThenBilled(trialLength(product), perPeriod(product))
                : copy.billedAs(perPeriod(product))}
            </Label>
          ) : null}
          </View>
          <PrimaryButton
            label={paywall ? subscriptionCopy.continue : copy.retry}
            loading={busy !== null}
            onPress={press}
          />
          <View
            style={[
              { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: t.space.xs },
              linksSpace > 0
                ? { position: 'absolute', left: t.layout.page, right: t.layout.page, bottom: insets.bottom / 2 }
                : { paddingTop: t.space.xs },
            ]}>
            {[
              { label: subscriptionCopy.termsOfUse.title, onPress: () => openLink(subscriptionCopy.termsOfUse.url) },
              {
                label: subscriptionCopy.restore,
                onPress: () => {
                  if (busy === null) void restore();
                },
              },
              {
                label: subscriptionCopy.privacyPolicy.title,
                onPress: () => openLink(subscriptionCopy.privacyPolicy.url),
              },
            ].map((link) => (
              <PressableScale
                key={link.label}
                label={link.label}
                haptic={link.label === subscriptionCopy.restore && busy !== null ? 'none' : 'tap'}
                onPress={link.onPress}
                style={{ minHeight: t.type.micro.lineHeight }}>
                <Label variant="micro" tone="secondary" style={{ textDecorationLine: 'underline' }}>
                  {link.label}
                </Label>
              </PressableScale>
            ))}
          </View>
        </>
      }>
      <PaywallHeadline />
      <PaywallReview />
      <PaywallTagline />
    </ScreenShell>
  );
}

function openLink(url: string) {
  void Linking.openURL(url).catch(() => notify(subscriptionCopy.linkError));
}

function PlanRow({
  product,
  selected,
  locked,
  onPress,
}: {
  product: PaywallProduct;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const m = useMotion(),
    pop = useSharedValue(1),
    first = useRef(true),
    name = `${planName(product)} ${perPeriod(product)}`,
    price = product.localizedWeeklyPrice && product.periodUnit !== 'week'
      ? `${product.localizedWeeklyPrice}${copy.perWeek}`
      : `${product.localizedPrice} / ${product.periodUnit ?? product.localizedPeriod}`;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected) pop.value = m.sequence(m.timing(m.scale.selected, 'press'), m.spring(1, 'pop'));
  }, [selected, m, pop]);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const tint = { color: selected ? t.text.onAccent : t.text.primary };
  return (
    <PressableScale
      label={`${name} · ${price}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      haptic={selected || locked ? 'none' : 'select'}
      onPress={onPress}>
      <Animated.View
        style={[
          scale,
          {
            minHeight: t.control.full,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: t.space.md,
            paddingHorizontal: t.space.xl,
            borderRadius: t.radius.pill,
            backgroundColor: selected ? t.brand.primary : t.surface.softChoice,
            ...m.transition(['backgroundColor'], 'standard'),
          },
        ]}>
        <Label variant="label" style={[tint, { flexShrink: 1, textAlign: 'left' }]}>
          {name}
        </Label>
        <Label variant="label" style={[tint, { textAlign: 'right' }]}>
          {price}
        </Label>
      </Animated.View>
    </PressableScale>
  );
}

import { restorePurchases } from '../../subscription/restorePurchases';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, CloseButton, Label, PressableScale, PrimaryButton, ScreenShell } from '../../ui';
import { notify } from '../../ui/Notice';
import { useMotion } from '../../ui/useMotion';
import { haptic } from '../../ui/haptics';
import { tokens as t } from '../../ui/tokens';
import { Icon } from '../../ui/Icon';
import { Reveal } from '../../ui/Reveal';
import type { PaywallProduct, PurchaseRecovery, SubscriptionPaywall } from '../../ports/SubscriptionPort';
import type { Entitlement } from '../../model/types';
import { eligible } from '../../journey/index';
import type { PaywallErrorOperation } from './paywallErrors';
import type { PaywallVariant } from '../../telemetry/PostHogAnalyticsAdapter';
import { useRuntime } from '../../ports/useRuntime';
import { subscriptionCopy, planRowTitle, planName, perPeriod } from '../../subscription/subscriptionCopy';
import { onboardingStore as useOnboardingStore } from '../../onboarding/onboardingStore';
import { rulesStore as useRulesStore } from '../../conditions/rulesStore';
import { draftFromAnswers } from '../../conditions/answersDraft';
import { toRule } from '../../conditions/draft';
import { scheduleDraft, toSchedule } from '../../conditions/scheduleDraft';
import { defaultPlanHandle } from './paywallVariant';
import { paywallPromises } from './paywallPromises';
import { fieldMinimum, PaywallField } from './PaywallField';
import { TrialSwitch } from './TrialSwitch';
import { pairOf, planFor, planPairs, trialSwitchable, withTrial, zeroPrice } from './paywallPlans';
import { paywallCopy as copy } from './paywallCopy';
const paywallLoadRetries = 2,
  planRowHeight = t.space.md * 2 + t.type.label.lineHeight + t.type.support.lineHeight + t.stroke.selected * 2;
export function PaywallScreen({
  placement,
  reportError,
  variantKey = 'control',
  onClose,
  onBack,
  onLoaded,
  onAccess,
  recovery,
}: {
  placement: SubscriptionPaywall['placement'];
  reportError: (error: unknown, operation: PaywallErrorOperation) => void;
  variantKey?: PaywallVariant;
  onClose?: () => void;
  onBack?: () => void;
  onLoaded?: (paywall: SubscriptionPaywall) => void;
  onAccess?: (entitlement: Entitlement) => void;
  recovery: PurchaseRecovery;
}) {
  const runtime = useRuntime(),
    insets = useSafeAreaInsets(),
    linksSpace = insets.bottom + t.space.xs - t.type.micro.lineHeight,
    answers = useOnboardingStore((state) => state.data.answers),
    committedRule = useRulesStore((state) => state.data.rules[0]),
    [paywall, setPaywall] = useState<SubscriptionPaywall | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState<'load' | 'purchase' | 'restore' | null>('load'),
    chosen = useRef(false),
    latest = useRef({ variantKey, onLoaded }),
    shown = useRef<number | null>(null),
    title = useRef<View>(null),
    [fieldBottom, setFieldBottom] = useState(0);
  const stagedRule = useMemo(() => {
    if (committedRule || !answers.ruleId) return undefined;
    try {
      return toRule(draftFromAnswers(answers), toSchedule(scheduleDraft(answers)));
    } catch {
      return undefined;
    }
  }, [committedRule, answers]);
  const rule = committedRule ?? stagedRule;
  useEffect(() => {
    latest.current = { variantKey, onLoaded };
  }, [variantKey, onLoaded]);
  const load = useCallback(async (): Promise<void> => {
    setBusy('load');
    for (let attempt = 0; ; attempt++) {
      try {
        const next = await runtime.subscription.loadPaywall(placement);
        setPaywall(next);
        setSelected(withTrial(next.products, defaultPlanHandle(next.products, latest.current.variantKey)));
        latest.current.onLoaded?.(next);
        runtime.analytics.track('paywall_viewed', {
          placement,
          has_trial: next.products.some((item) => item.offerLabel !== null),
          variation_id: next.flowVariationId || undefined,
        });
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
    setSelected(withTrial(paywall.products, defaultPlanHandle(paywall.products, variantKey)));
  }, [paywall, variantKey]);
  useEffect(() => {
    if (!paywall || shown.current === paywall.generation) return;
    shown.current = paywall.generation;
    void runtime.subscription.logPaywallShown(paywall.generation);
  }, [paywall, runtime]);
  const purchase = async () => {
    if (!selected || busy || recovery.type !== 'none') return;
    if (product) runtime.analytics.track('purchase_started', { placement, plan_id: product.vendorProductId });
    setBusy('purchase');
    let restoreExisting = false;
    try {
      const result = await runtime.subscription.purchase(selected);
      if (result.type === 'success') {
        if (eligible(result.entitlement, Date.parse(runtime.clock.now()))) {
          haptic('success');
          onAccess?.(result.entitlement);
        } else restoreExisting = true;
      } else if (result.type === 'pending') notify(subscriptionCopy.awaitingApproval);
      else if (result.type === 'already_subscribed') restoreExisting = true;
      else if (result.type === 'user_cancelled') runtime.analytics.track('purchase_failed', { reason_class: 'cancelled' });
    } catch (error) {
      runtime.analytics.track('purchase_failed', { reason_class: 'unknown' });
      reportError(error, 'purchase');
      notify(subscriptionCopy.error);
      haptic('error');
    } finally {
      setBusy(null);
    }
    if (restoreExisting) await restore();
  };
  async function restore() {
    setBusy('restore');
    try {
      if ((await restorePurchases(runtime.subscription, runtime.analytics)) === 'notFound') notify(subscriptionCopy.notFound);
      else {
        haptic('success');
        onAccess?.(runtime.subscription.entitlement());
      }
    } catch (error) {
      reportError(error, 'restore');
      notify(subscriptionCopy.error);
      haptic('error');
    } finally {
      setBusy(null);
    }
  }
  const continueRecovery = () => {
    if (recovery.type === 'accountConnection') onAccess?.(runtime.subscription.entitlement());
    else if (!busy) void restore();
  };
  const product = paywall?.products.find((item) => item.handle === selected);
  const press = () => {
    if (busy) return;
    if (recovery.type !== 'none') continueRecovery();
    else if (!paywall) void load();
    else void purchase();
  };
  const choose = (handle: string) => {
    if (busy === 'purchase' || busy === 'restore') return;
    chosen.current = true;
    setSelected(handle);
  };
  const pairs = useMemo(() => planPairs(paywall?.products ?? []), [paywall]),
    switchable = trialSwitchable(pairs),
    trialOn = !product || product.offerLabel !== null,
    promises = paywallPromises(answers, rule);
  const flip = (next: boolean) => {
    const pair = pairOf(pairs, selected);
    if (pair) choose(planFor(pair, next).handle);
  };
  const measureTitle = () =>
    title.current?.measureInWindow((_, y, __, height) => {
      const bottom = y + height / 2;
      setFieldBottom((current) => (Math.abs(current - bottom) > 1 ? bottom : current));
    });
  return (
    <ScreenShell
      scrollResetKey={paywall ? 'plans' : 'loading'}
      contentStyle={{ gap: t.space.md, paddingTop: 0 }}
      background={fieldBottom > 0 ? <PaywallField bottom={fieldBottom} /> : null}
      header={
        <View style={{ paddingHorizontal: t.layout.page, height: t.layout.header, flexDirection: 'row', alignItems: 'center' }}>
          {onClose ? <CloseButton label="Close" onPress={onClose} /> : onBack ? <BackButton onPress={onBack} /> : null}
        </View>
      }
      footer={
        <>
          {switchable ? (
            <Reveal index={4}>
              <TrialSwitch on={trialOn} locked={busy === 'purchase' || busy === 'restore'} onToggle={flip} />
            </Reveal>
          ) : null}
          <View style={{ gap: t.space.md, paddingTop: t.space.md, minHeight: planRowHeight * 2 + t.space.md * 2 }}>
            {pairs.map((pair, index) => {
              const item = planFor(pair, trialOn);
              return (
                <Reveal key={pair.period} index={index + 5}>
                  <PlanRow
                    product={item}
                    best={pair.recommended}
                    selected={selected === item.handle}
                    locked={busy !== null}
                    onPress={() => choose(item.handle)}
                  />
                </Reveal>
              );
            })}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.space.sm,
              opacity: trialOn ? 1 : 0,
            }}>
            <Icon name="check" size={t.icon.md} variant="utility" />
            <Label variant="label">{subscriptionCopy.noPayment}</Label>
          </View>
          <PrimaryButton
            label={
              recovery.type === 'accountConnection'
                ? subscriptionCopy.signInToContinue
                : recovery.type === 'pending' || !trialOn
                  ? subscriptionCopy.continue
                  : subscriptionCopy.startFor(product ? zeroPrice(product.localizedPrice) : subscriptionCopy.zeroPrice)
            }
            loading={busy !== null}
            onPress={press}
          />
          <View
            style={[
              { flexDirection: 'row', justifyContent: 'center', gap: t.space.lg },
              linksSpace > 0
                ? { position: 'absolute', left: 0, right: 0, bottom: insets.bottom / 2 }
                : { paddingTop: t.space.xs },
            ]}>
            {[
              { label: subscriptionCopy.termsOfUse.title, onPress: () => openLink(subscriptionCopy.termsOfUse.url) },
              { label: subscriptionCopy.privacyPolicy.title, onPress: () => openLink(subscriptionCopy.privacyPolicy.url) },
              { label: subscriptionCopy.restore, onPress: () => { if (busy === null) void restore(); } },
            ].map((link) => (
              <PressableScale
                key={link.label}
                label={link.label}
                haptic={link.label === subscriptionCopy.restore && busy !== null ? 'none' : 'tap'}
                onPress={link.onPress}
                style={{ minHeight: t.type.micro.lineHeight }}>
                <Label variant="micro" tone="secondary">
                  {link.label}
                </Label>
              </PressableScale>
            ))}
          </View>
        </>
      }>
      <View style={{ flex: 1, minHeight: fieldMinimum }} />
      <View ref={title} onLayout={measureTitle} collapsable={false} style={{ marginTop: -t.space.md }}>
        <Label accessibilityRole="header" accessibilityLabel={copy.title} variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center' }}>
          {copy.before}
          <Label variant="display" style={{ color: t.brand.primary }}>{copy.emphasis}</Label>
          {copy.after}
        </Label>
      </View>
      <Reveal
        index={1}
        style={{
          gap: t.space.sm,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          marginTop: -t.space.md,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
          backgroundColor: t.surface.card,
        }}>
        <Label variant="label" style={{ textAlign: 'left' }}>{subscriptionCopy.benefitsTitle}</Label>
        {promises.map((promise) => (
          <View key={promise.text} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <View
              style={{
                width: t.control.indicator,
                height: t.control.indicator,
                borderRadius: t.radius.pill,
                backgroundColor: t.brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name={promise.icon} size={t.icon.md} tone="onAccent" variant="utility" />
            </View>
            <Label variant="body" style={{ flex: 1, textAlign: 'left' }}>
              {promise.text}
            </Label>
          </View>
        ))}
      </Reveal>
    </ScreenShell>
  );
}

function openLink(url: string) {
  void Linking.openURL(url).catch(() => notify(subscriptionCopy.linkError));
}

function PlanRow({
  product,
  best,
  selected,
  locked,
  onPress,
}: {
  product: PaywallProduct;
  best: boolean;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const m = useMotion(),
    pop = useSharedValue(1),
    first = useRef(true),
    monthly = product.periodUnit !== 'month' && product.localizedMonthlyPrice ? subscriptionCopy.perMonthOnly(product.localizedMonthlyPrice) : null,
    detail = [product.offerLabel ? subscriptionCopy.trialBadge(product.offerLabel) : null, monthly]
      .filter(Boolean)
      .join(' · ') || subscriptionCopy.billedMonthly;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected) pop.value = m.sequence(m.timing(m.scale.selected, 'press'), m.spring(1, 'pop'));
  }, [selected, m, pop]);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <PressableScale
      label={`${planRowTitle(product)} · ${detail}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      haptic={selected || locked ? 'none' : 'select'}
      onPress={onPress}>
      <Animated.View style={scale}>
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.md,
            paddingVertical: t.space.md,
            paddingHorizontal: t.space.lg,
            borderRadius: t.radius.card,
            borderWidth: selected ? t.stroke.selected : t.stroke.hairline,
            borderColor: selected ? t.brand.primary : t.border.outline,
            backgroundColor: selected ? t.surface.selected : t.surface.card,
            ...m.transition(['borderColor', 'backgroundColor'], 'standard'),
          }}>
          <View style={{ flex: 1 }}>
            <Label variant="label" style={{ textAlign: 'left' }}>
              {`${planName(product)} · ${perPeriod(product)}`}
            </Label>
            <Label variant="support" tone="secondary" style={{ textAlign: 'left' }}>
              {detail}
            </Label>
          </View>
          <Animated.View
            style={{
              width: t.icon.md,
              height: t.icon.md,
              borderRadius: t.radius.pill,
              borderWidth: selected ? 0 : t.stroke.selected,
              borderColor: t.border.mutedStroke,
              backgroundColor: selected ? t.brand.primary : t.surface.card,
              alignItems: 'center',
              justifyContent: 'center',
              ...m.transition(['backgroundColor'], 'standard'),
            }}>
            {selected ? <Icon name="check" size={t.icon.sm} tone="onAccent" variant="utility" /> : null}
          </Animated.View>
        </Animated.View>
        {best ? (
          <View style={{ position: 'absolute', top: -t.space.md, right: t.space.xl }}>
            <View
              style={{
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.xs / 2,
                borderRadius: t.radius.pill,
                backgroundColor: t.brand.primary,
              }}>
              <Label variant="micro" style={{ color: t.text.onAccent }}>
                {subscriptionCopy.bestOffer.toUpperCase()}
              </Label>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

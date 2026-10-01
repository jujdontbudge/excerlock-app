import { restorePurchases } from '../../subscription/restorePurchases';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseButton, Label, PressableScale, PrimaryButton, ScreenShell } from '../../ui';
import { Icon } from '../../ui/Icon';
import { notify } from '../../ui/Notice';
import { useMotion } from '../../ui/useMotion';
import { haptic } from '../../ui/haptics';
import { tokens as t } from '../../ui/tokens';
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
import { pairOf, planFor, planPairs, trialLength, trialSwitchable, withTrial, zeroPrice } from './paywallPlans';
import { paywallCopy as copy } from './paywallCopy';
const glass = isLiquidGlassAvailable(),
  paywallLoadRetries = 2,
  planRowHeight = t.space.md * 2 + t.type.body.lineHeight * 2 + t.stroke.selected * 2;
export function PaywallScreen({
  placement,
  reportError,
  variantKey = 'control',
  onClose,
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
    card = useRef<View>(null),
    heading = useRef<View>(null),
    [fieldBottom, setFieldBottom] = useState(0),
    [titleBand, setTitleBand] = useState({ top: 0, bottom: 0 });
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
      else if (result.type === 'user_cancelled')
        runtime.analytics.track('purchase_failed', { reason_class: 'cancelled' });
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
      if ((await restorePurchases(runtime.subscription, runtime.analytics)) === 'notFound')
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
  const measureCard = () =>
    card.current?.measureInWindow((_, y, __, height) => {
      const bottom = y + height;
      setFieldBottom((current) => (Math.abs(current - bottom) > 1 ? bottom : current));
    });
  const measureTitle = () =>
    heading.current?.measureInWindow((_, y, __, height) =>
      setTitleBand((current) =>
        Math.abs(current.top - y) > 1 || Math.abs(current.bottom - y - height) > 1
          ? { top: y, bottom: y + height }
          : current,
      ),
    );
  return (
    <ScreenShell
      scrollResetKey={paywall ? 'plans' : 'loading'}
      contentStyle={{ gap: t.space.md, paddingTop: onClose ? 0 : insets.top }}
      background={
        fieldBottom > 0 && titleBand.bottom > 0 ? <PaywallField bottom={fieldBottom} title={titleBand} /> : null
      }
      header={
        onClose ? (
          <View
            style={{
              paddingHorizontal: t.layout.page,
              height: t.layout.header,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
            <CloseButton label="Close" onPress={onClose} />
          </View>
        ) : undefined
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
      <View style={{ flex: 1, minHeight: fieldMinimum }} />
      <View ref={heading} onLayout={measureTitle} collapsable={false} style={{ marginBottom: -t.space.md }}>
        <Label
          accessibilityRole="header"
          accessibilityLabel={copy.title}
          variant="display"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ textAlign: 'center', textShadowColor: t.paywall.titleHalo, textShadowRadius: t.space.md }}>
          {copy.before}
          <Label variant="display" style={{ color: t.brand.primary }}>
            {copy.emphasis}
          </Label>
          {copy.after}
        </Label>
      </View>
      <View ref={card} onLayout={measureCard} collapsable={false} style={{ alignSelf: 'center' }}>
        <Reveal index={1}>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={t.paywall.frost}
            style={{
              gap: t.space.md,
              paddingHorizontal: t.space.xl,
              paddingVertical: t.space.lg,
              borderRadius: t.radius.sheet,
              overflow: 'hidden',
              backgroundColor: glass ? undefined : t.surface.glass,
            }}>
            <Label variant="section" style={{ textAlign: 'left' }}>
              {subscriptionCopy.benefitsTitle}
            </Label>
            {promises.map((promise) => (
              <View key={promise.text} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
                <Label variant="section" accessible={false} style={{ width: t.icon.lg, textAlign: 'center' }}>
                  {promise.mark}
                </Label>
                <Label variant="body" style={{ flexShrink: 1, textAlign: 'left' }}>
                  {promise.text}
                </Label>
              </View>
            ))}
          </GlassView>
        </Reveal>
      </View>
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
    monthly = `${product.localizedMonthlyPrice ?? product.localizedPrice}${subscriptionCopy.perMonthShort}`,
    lead = product.offerLabel ? subscriptionCopy.trialThen(trialLength(product.offerLabel)) : '',
    top = lead ? subscriptionCopy.free : perPeriod(product);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected) pop.value = m.sequence(m.timing(m.scale.selected, 'press'), m.spring(1, 'pop'));
  }, [selected, m, pop]);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const strong = { color: t.text.primary, fontFamily: t.font.bold };
  return (
    <PressableScale
      label={`${planRowTitle(product)} · ${planName(product)} ${top} · ${lead}${monthly}`}
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
            backgroundColor: t.surface.card,
            ...m.transition(['borderColor'], 'standard'),
          }}>
          <View style={{ flex: 1 }}>
            <Label
              variant="body"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ textAlign: 'left', color: t.text.secondary }}>
              {`${planName(product)} `}
              <Label variant="body" style={strong}>
                {top}
              </Label>
            </Label>
            <Label
              variant="body"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ textAlign: 'left', color: t.text.secondary }}>
              {lead}
              <Label variant="body" style={strong}>
                {monthly}
              </Label>
            </Label>
          </View>
          <View
            style={{
              width: t.icon.lg - t.space.sm,
              height: t.icon.lg - t.space.sm,
              borderRadius: t.radius.pill,
              borderWidth: t.stroke.selected,
              borderColor: selected ? t.brand.primary : t.border.mutedStroke,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {selected ? (
              <View
                style={{
                  width: t.icon.sm,
                  height: t.icon.sm,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.brand.primary,
                }}
              />
            ) : null}
          </View>
        </Animated.View>
        {best ? (
          <View style={{ position: 'absolute', top: -t.space.md, right: t.space.xxl * 2 }}>
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

import { restorePurchases } from '../../subscription/restorePurchases';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseButton, Label, PressableScale, ScreenShell } from '../../ui';
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
import { pairOf, planFor, planPairs, trialSwitchable, withTrial, zeroPrice } from './paywallPlans';
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
  const measureCard = () =>
    card.current?.measureInWindow((_, y, __, height) => {
      const bottom = y + height;
      setFieldBottom((current) => (Math.abs(current - bottom) > 1 ? bottom : current));
    });
  return (
    <ScreenShell
      scrollResetKey={paywall ? 'plans' : 'loading'}
      tinted={false}
      contentStyle={{ gap: t.space.md, paddingTop: onClose ? 0 : insets.top }}
      background={
        <>
          <StatusBar style="light" />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: t.paywall.canvas }} />
          {fieldBottom > 0 ? <PaywallField bottom={fieldBottom} /> : null}
        </>
      }
      header={
        onClose ? (
          <View style={{ paddingHorizontal: t.layout.page, height: t.layout.header, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
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
            <SymbolView name="checkmark.circle.fill" size={t.icon.md} tintColor={t.paywall.check} />
            <Label variant="label" style={{ color: t.paywall.text }}>{subscriptionCopy.noPayment}</Label>
          </View>
          <GradientButton
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
              { label: subscriptionCopy.restore, onPress: () => { if (busy === null) void restore(); } },
              { label: subscriptionCopy.privacyPolicy.title, onPress: () => openLink(subscriptionCopy.privacyPolicy.url) },
            ].map((link) => (
              <PressableScale
                key={link.label}
                label={link.label}
                haptic={link.label === subscriptionCopy.restore && busy !== null ? 'none' : 'tap'}
                onPress={link.onPress}
                style={{ minHeight: t.type.micro.lineHeight }}>
                <Label variant="micro" style={{ color: t.paywall.faint, textDecorationLine: 'underline' }}>
                  {link.label}
                </Label>
              </PressableScale>
            ))}
          </View>
        </>
      }>
      <View style={{ flex: 1, minHeight: fieldMinimum }} />
      <Label
        accessibilityRole="header"
        accessibilityLabel={copy.title}
        variant="display"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          textAlign: 'center',
          color: t.paywall.text,
          textTransform: 'uppercase',
          marginBottom: -t.space.md,
          textShadowColor: t.paywall.titleShadow,
          textShadowRadius: t.space.md,
        }}>
        {copy.title}
      </Label>
      <View ref={card} onLayout={measureCard} collapsable={false} style={{ alignSelf: 'center' }}>
        <Reveal index={1}>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            tintColor={t.paywall.glassTint}
            style={{
              gap: t.space.md,
              paddingHorizontal: t.space.xl,
              paddingVertical: t.space.lg,
              borderRadius: t.radius.sheet,
              overflow: 'hidden',
              backgroundColor: glass ? undefined : t.paywall.glass,
            }}>
            <Label variant="section" style={{ textAlign: 'left', color: t.paywall.text }}>{subscriptionCopy.benefitsTitle}</Label>
            {promises.map((promise) => (
              <View key={promise.text} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
                <Label variant="section" accessible={false} style={{ width: t.icon.lg, textAlign: 'center' }}>
                  {promise.mark}
                </Label>
                <Label variant="body" style={{ flexShrink: 1, textAlign: 'left', color: t.paywall.text }}>
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

function GradientButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false),
    m = useMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      onPressIn={() => setPressed(!loading)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (loading) return;
        haptic('tap');
        onPress();
      }}>
      <Animated.View
        style={{
          minHeight: t.control.full,
          borderRadius: t.radius.pill,
          overflow: 'hidden',
          transform: [{ scale: pressed ? m.scale.pressed : 1 }],
          ...m.transition(['transform'], 'standard'),
        }}>
        <LinearGradient
          colors={t.paywall.cta}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            flex: 1,
            minHeight: t.control.full,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space.md,
            paddingHorizontal: t.space.xl,
          }}>
          <Label variant="section" style={{ color: t.paywall.text, textAlign: 'center' }}>
            {label}
          </Label>
          <SymbolView name="arrow.right" size={t.icon.md} weight="bold" tintColor={t.paywall.text} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
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
    monthly = product.periodUnit !== 'month' ? product.localizedMonthlyPrice : null,
    trial = product.offerLabel ? subscriptionCopy.trialBadge(product.offerLabel) : null,
    detail = [trial, monthly ? subscriptionCopy.perMonthOnly(monthly) : null].filter(Boolean).join(' · ') || subscriptionCopy.billedMonthly;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected) pop.value = m.sequence(m.timing(m.scale.selected, 'press'), m.spring(1, 'pop'));
  }, [selected, m, pop]);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const strong = { color: t.paywall.text, fontFamily: t.font.bold };
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
            borderRadius: t.radius.sheet,
            borderWidth: t.stroke.selected,
            borderColor: selected ? t.paywall.glow : t.paywall.rowBorder,
            backgroundColor: t.paywall.canvas,
            boxShadow: selected ? t.paywall.glowShadow : undefined,
            ...m.transition(['borderColor'], 'standard'),
          }}>
          <View style={{ flex: 1 }}>
            <Label variant="body" style={{ textAlign: 'left', color: t.paywall.muted }}>
              {`${planName(product)} `}
              <Label variant="body" style={strong}>{perPeriod(product)}</Label>
            </Label>
            <Label variant="body" numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'left', color: t.paywall.muted }}>
              {trial ? <Label variant="body" style={strong}>{trial}</Label> : null}
              {trial && monthly ? ' · ' : null}
              {monthly ? (
                <>
                  {trial ? null : subscriptionCopy.only}
                  <Label variant="body" style={strong}>{monthly}</Label>
                  {trial ? subscriptionCopy.perMonthShort : subscriptionCopy.perMonthTail}
                </>
              ) : null}
              {!trial && !monthly ? subscriptionCopy.billedMonthly : null}
            </Label>
          </View>
          <View
            style={{
              width: t.icon.lg - t.space.sm,
              height: t.icon.lg - t.space.sm,
              borderRadius: t.radius.pill,
              borderWidth: t.stroke.selected,
              borderColor: selected ? t.paywall.radio : t.paywall.faint,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {selected ? (
              <View style={{ width: t.icon.sm, height: t.icon.sm, borderRadius: t.radius.pill, backgroundColor: t.paywall.radio }} />
            ) : null}
          </View>
        </Animated.View>
        {best ? (
          <View style={{ position: 'absolute', top: -t.space.md, right: t.space.xxl * 2 }}>
            <LinearGradient
              colors={t.paywall.pill}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ paddingHorizontal: t.space.md, paddingVertical: t.space.xs / 2, borderRadius: t.radius.pill }}>
              <Label variant="label" style={{ color: t.paywall.text, fontFamily: t.font.bold }}>
                {subscriptionCopy.bestOffer.toUpperCase()}
              </Label>
            </LinearGradient>
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

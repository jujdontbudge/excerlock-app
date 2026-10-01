import { restorePurchases } from '../../subscription/restorePurchases';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton, CloseButton, Label, PressableScale, PrimaryButton, ScreenShell } from '../../ui';
import { notify } from '../../ui/Notice';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';
import { Icon } from '../../ui/Icon';
import { Reveal } from '../../ui/Reveal';
import type { PaywallProduct, PurchaseRecovery, SubscriptionPaywall } from '../../ports/SubscriptionPort';
import type { Entitlement } from '../../model/types';
import { eligible } from '../../journey/index';
import type { PaywallErrorOperation } from './paywallErrors';
import type { PaywallVariant } from '../../telemetry/PostHogAnalyticsAdapter';
import { useRuntime } from '../../ports/useRuntime';
import { subscriptionCopy, planRowTitle, planName, perMonth, perPeriod } from '../../subscription/subscriptionCopy';
import { onboardingStore as useOnboardingStore } from '../../onboarding/onboardingStore';
import { rulesStore as useRulesStore } from '../../conditions/rulesStore';
import { draftFromAnswers } from '../../conditions/answersDraft';
import { toRule } from '../../conditions/draft';
import { scheduleDraft, toSchedule } from '../../conditions/scheduleDraft';
import { defaultPlanHandle } from './paywallVariant';
import { paywallPromises } from './paywallPromises';
import { PaywallHero } from './PaywallHero';
import { paywallCopy as copy } from './paywallCopy';
const paywallLoadRetries = 2,
  planRowHeight =
    t.space.md * 3 + t.type.body.lineHeight + t.type.label.lineHeight + t.type.micro.lineHeight + t.stroke.selected * 2;
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
    answers = useOnboardingStore((state) => state.data.answers),
    committedRule = useRulesStore((state) => state.data.rules[0]),
    [paywall, setPaywall] = useState<SubscriptionPaywall | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState<'load' | 'purchase' | 'restore' | null>('load'),
    chosen = useRef(false),
    latest = useRef({ variantKey, onLoaded }),
    shown = useRef<number | null>(null);
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
  const load = useCallback(async (attempt = 0): Promise<void> => {
    setBusy('load');
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
      if (attempt < paywallLoadRetries) {
        await new Promise((resolve) => setTimeout(resolve, t.motion.hold.notice));
        return load(attempt + 1);
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
    setSelected(defaultPlanHandle(paywall.products, variantKey));
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
        if (eligible(result.entitlement, Date.parse(runtime.clock.now()))) onAccess?.(result.entitlement);
        else restoreExisting = true;
      } else if (result.type === 'pending') notify(subscriptionCopy.awaitingApproval);
      else if (result.type === 'already_subscribed') restoreExisting = true;
      else if (result.type === 'user_cancelled') runtime.analytics.track('purchase_failed', { reason_class: 'cancelled' });
    } catch (error) {
      runtime.analytics.track('purchase_failed', { reason_class: 'unknown' });
      reportError(error, 'purchase');
      notify(subscriptionCopy.error);
    } finally {
      setBusy(null);
    }
    if (restoreExisting) await restore();
  };
  async function restore() {
    setBusy('restore');
    try {
      if ((await restorePurchases(runtime.subscription, runtime.analytics)) === 'notFound') notify(subscriptionCopy.notFound);
      else onAccess?.(runtime.subscription.entitlement());
    } catch (error) {
      reportError(error, 'restore');
      notify(subscriptionCopy.error);
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
  return (
    <ScreenShell
      scrollResetKey={paywall ? 'plans' : 'loading'}
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
            <View style={{ width: t.control.full }} />
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.space.sm,
              opacity: !product || product.offerLabel ? 1 : 0,
            }}>
            <Icon name="check" size={t.icon.md} variant="utility" />
            <Label variant="label">{subscriptionCopy.noPayment}</Label>
          </View>
          <View style={{ flexDirection: 'row', gap: t.space.md, paddingTop: t.space.md, minHeight: planRowHeight }}>
            {paywall?.products.map((item, index) => (
              <Reveal key={item.handle} index={index + 4} style={{ flex: 1 }}>
                <PlanCard product={item} selected={selected === item.handle} onPress={() => choose(item.handle)} />
              </Reveal>
            ))}
          </View>
          <PrimaryButton
            label={
              recovery.type === 'accountConnection'
                ? subscriptionCopy.signInToContinue
                : recovery.type === 'pending' || (product && !product.offerLabel)
                  ? subscriptionCopy.continue
                  : subscriptionCopy.start
            }
            loading={busy !== null}
            onPress={press}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space.lg, paddingTop: t.space.xs }}>
            {[
              { label: subscriptionCopy.termsOfUse.title, onPress: () => openLink(subscriptionCopy.termsOfUse.url) },
              { label: subscriptionCopy.privacyPolicy.title, onPress: () => openLink(subscriptionCopy.privacyPolicy.url) },
              { label: subscriptionCopy.restore, onPress: () => { if (busy === null) void restore(); } },
            ].map((link) => (
              <PressableScale key={link.label} label={link.label} onPress={link.onPress}>
                <Label variant="micro" tone="secondary">
                  {link.label}
                </Label>
              </PressableScale>
            ))}
          </View>
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
    </ScreenShell>
  );
}

function openLink(url: string) {
  void Linking.openURL(url).catch(() => notify(subscriptionCopy.linkError));
}

function PlanCard({
  product,
  selected,
  onPress,
}: {
  product: PaywallProduct;
  selected: boolean;
  onPress: () => void;
}) {
  const m = useMotion(),
    ink = selected ? t.text.onAccent : t.text.primary,
    price = perPeriod(product),
    monthly = product.periodUnit !== 'month' && product.localizedMonthlyPrice ? perMonth(product.localizedMonthlyPrice) : ' ';
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
        <Label variant="micro" style={{ color: ink, textAlign: 'center' }}>
          {monthly}
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

import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { Label, PressableScale, ScreenShell } from '../../ui';
import { Icon } from '../../ui/Icon';
import { notify } from '../../ui/Notice';
import { controls } from '../../ui/controlsCopy';
import { haptic, scheduleHaptic } from '../../ui/haptics';
import { opacityIn } from '../../ui/presets';
import { useMotion } from '../../ui/useMotion';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { eligible } from '../../journey/index';
import { useRuntime } from '../../ports/useRuntime';
import type { PaywallProduct } from '../../ports/SubscriptionPort';
import type { Entitlement } from '../../model/types';
import { restorePurchases } from '../../subscription/restorePurchases';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';
import { HotWord } from './HotWord';
import { trialLength } from './paywallPlans';
import { paywallCopy } from './paywallCopy';
import { discountPercent, markCloseOfferSeen, monthlyAnchor } from './closeOffer';
import type { PaywallErrorOperation } from './paywallErrors';

const copy = paywallCopy.closeOffer,
  look = {
    cardAt: 420,
    count: 900,
    from: 0.6,
    glow: 6,
    closeAt: 1400,
    ctaAt: 2200,
    breath: 1.035,
    sparkles: [
      { size: 22, x: 0.35, y: 0.18, at: 0 },
      { size: 30, x: 0.65, y: 0.5, at: 700 },
      { size: 18, x: 0.3, y: 0.82, at: 1300 },
    ],
    twinkle: 0.45,
    was: 0.75,
  } as const,
  sparkle = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z';

type Offer = { generation: number; product: PaywallProduct; percent: number; anchor: string };

export function CloseOfferScreen({
  onAccess,
  onLeave,
  onFullPrice,
  reportError,
}: {
  onAccess: (entitlement: Entitlement) => void;
  onLeave: () => void;
  onFullPrice: () => void;
  reportError: (error: unknown, operation: PaywallErrorOperation) => void;
}) {
  const runtime = useRuntime(),
    insets = useSafeAreaInsets(),
    [offer, setOffer] = useState<Offer | null>(null),
    [busy, setBusy] = useState<'purchase' | 'restore' | null>(null),
    inFlight = useRef(false),
    latest = useRef({ onAccess, onLeave });
  useEffect(() => {
    latest.current = { onAccess, onLeave };
  }, [onAccess, onLeave]);
  useEffect(() => {
    let active = true;
    const anchor = monthlyAnchor();
    void runtime.subscription.loadPaywall('close_offer').then(
      (paywall) => {
        if (!active) return;
        const product = paywall.products.find((item) => item.periodUnit === 'year');
        const percent = product && anchor ? discountPercent(product, anchor) : null;
        if (!product || !anchor || percent === null || !product.localizedMonthlyPrice) {
          latest.current.onLeave();
          return;
        }
        markCloseOfferSeen();
        setOffer({ generation: paywall.generation, product, percent, anchor: anchor.price });
        runtime.analytics.track('paywall_viewed', {
          placement: 'close_offer',
          has_trial: Boolean(product.trialOffer),
          variation_id: paywall.flowVariationId || undefined,
        });
        void runtime.subscription.logPaywallShown(paywall.generation).catch((error) => reportError(error, 'load'));
      },
      (error) => {
        reportError(error, 'load');
        if (active) latest.current.onLeave();
      },
    );
    return () => {
      active = false;
    };
  }, [runtime, reportError]);
  useEffect(() => {
    const admitIfPaid = (entitlement: Entitlement) => {
      if (eligible(entitlement, Date.parse(runtime.clock.now()))) latest.current.onAccess(entitlement);
    };
    return runtime.subscription.subscribe(admitIfPaid);
  }, [runtime]);
  const restore = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy('restore');
    try {
      if ((await restorePurchases(runtime.subscription, 'close_offer')) === 'notFound') notify(subscriptionCopy.notFound);
      else {
        haptic('success');
        onAccess(runtime.subscription.entitlement());
      }
    } catch (error) {
      reportError(error, 'restore');
      notify(subscriptionCopy.error);
      haptic('error');
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };
  const claim = async () => {
    if (!offer || inFlight.current) return;
    inFlight.current = true;
    setBusy('purchase');
    let restoreExisting = false;
    try {
      const result = await runtime.subscription.purchase(offer.product.handle);
      if (result.type === 'success') {
        const entitlement = eligible(result.entitlement, Date.parse(runtime.clock.now()))
          ? result.entitlement
          : await runtime.subscription.refresh();
        haptic('success');
        if (eligible(entitlement, Date.parse(runtime.clock.now()))) onAccess(entitlement);
        else notify(paywallCopy.confirming);
      } else if (result.type === 'pending') notify(subscriptionCopy.awaitingApproval);
      else if (result.type === 'already_subscribed') restoreExisting = true;
    } catch (error) {
      reportError(error, 'purchase');
      notify(subscriptionCopy.error);
      haptic('error');
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
    if (restoreExisting) await restore();
  };
  const close = () => {
    runtime.analytics.track('paywall_closed', { placement: 'close_offer' });
    onLeave();
  };
  const fullPrice = () => {
    runtime.analytics.track('paywall_closed', { placement: 'close_offer' });
    onFullPrice();
  };
  return (
    <ScreenShell
      tinted={false}
      warm={false}
      background={<View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.brand.primary }]} />}
      contentStyle={{ gap: t.space.xl, paddingTop: insets.top + t.space.sm }}
      footer={
        offer ? (
          <OfferFooter
            offer={offer}
            busy={busy}
            onClaim={() => void claim()}
            onFullPrice={fullPrice}
            onRestore={() => {
              if (busy === null) void restore();
            }}
          />
        ) : null
      }>
      <StatusBar style="light" />
      {offer ? <OfferHero offer={offer} onClose={close} /> : null}
    </ScreenShell>
  );
}

function OfferHero({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const m = useMotion(),
    percent = offer.percent,
    pop = useSharedValue(m.reduced ? 1 : look.from),
    shown = useSharedValue(m.reduced ? 1 : 0),
    number = useSharedValue(m.reduced ? percent : 0),
    [value, setValue] = useState(m.reduced ? percent : 0);
  useAnimatedReaction(
    () => Math.round(number.get()),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setValue, current);
    },
  );
  useEffect(() => {
    if (m.reduced) return;
    pop.value = m.delay(look.cardAt, m.spring(1, 'pop'));
    shown.value = m.delay(look.cardAt, m.timing(1, 'standard'));
    number.set(m.delay(look.cardAt, m.timing(percent, 'emphasized', { curve: 'enter', stretch: look.count / t.motion.duration.emphasized })));
    const cancel = scheduleHaptic('success', look.cardAt + look.count);
    return () => {
      cancel();
      [pop, shown, number].forEach((item) => cancelAnimation(item));
    };
  }, [m, pop, shown, number, percent]);
  const card = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: pop.value }] }));
  const monthly = offer.product.localizedMonthlyPrice ?? offer.product.localizedPrice;
  return (
    <>
      <View style={{ height: t.control.inline, alignItems: 'flex-end', justifyContent: 'center' }}>
        <Animated.View entering={opacityIn('emphasized', look.closeAt)}>
          <PressableScale
            label={controls.close}
            haptic="select"
            onPress={onClose}
            style={{ width: t.icon.md, height: t.control.inline, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" variant="utility" tone="onAccent" size={t.icon.md} />
          </PressableScale>
        </Animated.View>
      </View>
      <Reveal index={0}>
        <Label variant="display" tone="onAccent" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {copy.eyebrow}
        </Label>
      </Reveal>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Sparkles />
        <Animated.View
          accessible
          accessibilityLabel={copy.a11y(percent)}
          style={[
            {
              flex: 1,
              alignItems: 'center',
              paddingTop: t.space.lg,
              paddingBottom: t.space.xl,
              borderRadius: t.radius.card,
              backgroundColor: t.surface.card,
              boxShadow: t.shadow.status,
            },
            card,
          ]}>
          <HotWord text={copy.off(value)} variant="deal" glow={look.glow} shineDelay={look.cardAt + look.count} />
          <Label variant="display" style={{ textAlign: 'center' }}>
            {copy.forever}
          </Label>
        </Animated.View>
        <Sparkles mirrored />
      </View>
      <Reveal index={3}>
        <View
          accessible
          accessibilityLabel={`${copy.was(offer.anchor)}, now ${copy.perMonth(monthly)}`}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm }}>
          <Label
            variant="section"
            tone="onAccent"
            style={{ opacity: look.was, textDecorationLine: 'line-through' }}>
            {copy.perMonth(offer.anchor)}
          </Label>
          <Label variant="metricSmall" tone="onAccent">
            {copy.perMonth(monthly)}
          </Label>
        </View>
      </Reveal>
    </>
  );
}

function Sparkles({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <View style={{ width: t.space.xxl + t.space.sm, alignSelf: 'stretch' }}>
      {look.sparkles.map((item, index) => (
        <Twinkle key={index} size={item.size} x={mirrored ? 1 - item.x : item.x} y={item.y} at={item.at + (mirrored ? look.count / 2 : 0)} />
      ))}
    </View>
  );
}

function Twinkle({ size, x, y, at }: { size: number; x: number; y: number; at: number }) {
  const m = useMotion(),
    glint = useSharedValue(m.reduced ? 1 : 0);
  useEffect(() => {
    if (m.reduced) return;
    glint.value = m.delay(
      look.cardAt + at,
      withRepeat(m.sequence(m.timing(1, 'emphasized', { stretch: 2 }), m.timing(look.twinkle, 'breathe', { stretch: 0.3 })), -1, true),
    );
    return () => cancelAnimation(glint);
  }, [m, glint, at]);
  const style = useAnimatedStyle(() => ({
    opacity: glint.value,
    transform: [{ scale: glint.value }, { rotate: `${(1 - glint.value) * 45}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, left: `${x * 100}%`, top: `${y * 100}%`, marginLeft: -size / 2, marginTop: -size / 2 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={sparkle} fill={t.swatch.yellow} />
      </Svg>
    </Animated.View>
  );
}

function OfferFooter({
  offer,
  busy,
  onClaim,
  onFullPrice,
  onRestore,
}: {
  offer: Offer;
  busy: 'purchase' | 'restore' | null;
  onClaim: () => void;
  onFullPrice: () => void;
  onRestore: () => void;
}) {
  const m = useMotion(),
    insets = useSafeAreaInsets(),
    breath = useSharedValue(1),
    product = offer.product,
    length = product.trialOffer ? trialLength(product) : null,
    monthly = copy.perMonth(product.localizedMonthlyPrice ?? product.localizedPrice);
  useEffect(() => {
    if (m.reduced) return;
    breath.value = m.delay(
      look.ctaAt,
      withRepeat(m.sequence(m.timing(look.breath, 'breathe', { stretch: 0.25 }), m.timing(1, 'breathe', { stretch: 0.25 })), -1),
    );
    return () => cancelAnimation(breath);
  }, [m, breath]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const links = [
    { label: subscriptionCopy.termsOfUse.title, onPress: () => openLink(subscriptionCopy.termsOfUse.url) },
    { label: subscriptionCopy.restore, onPress: onRestore },
    { label: subscriptionCopy.privacyPolicy.title, onPress: () => openLink(subscriptionCopy.privacyPolicy.url) },
  ];
  return (
    <>
      <Reveal index={5}>
        <View style={{ gap: t.space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm }}>
            <Icon name="info" variant="utility" tone="onAccent" size={t.icon.sm} />
            <Label variant="support" tone="onAccent">
              {copy.warning}
            </Label>
          </View>
          <View
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: true, selected: true }}
            accessibilityLabel={`${copy.lowest}. ${copy.plan}, ${copy.term(product.localizedPrice, length)}, ${monthly}`}
            style={{ borderRadius: t.radius.card, borderWidth: t.stroke.chart, borderColor: t.surface.card, overflow: 'hidden' }}>
            <View style={{ alignItems: 'center', paddingVertical: t.space.xs, backgroundColor: t.surface.card }}>
              <Label variant="micro">{copy.lowest}</Label>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: t.space.md,
                paddingHorizontal: t.space.lg,
                paddingVertical: t.space.md,
              }}>
              <View style={{ flexShrink: 1 }}>
                <Label variant="section" tone="onAccent">
                  {copy.plan}
                </Label>
                <Label variant="support" tone="onAccent">
                  {copy.term(product.localizedPrice, length)}
                </Label>
              </View>
              <Label variant="section" tone="onAccent">
                {monthly}
              </Label>
            </View>
          </View>
        </View>
      </Reveal>
      <Reveal index={6}>
        <View style={{ gap: t.space.md }}>
          <Animated.View style={pulse}>
            <PressableScale
              label={copy.claim}
              accessibilityState={{ busy: busy !== null }}
              haptic="tap"
              onPress={() => {
                if (busy === null) onClaim();
              }}
              style={{
                minHeight: t.control.full,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: t.radius.pill,
                backgroundColor: t.surface.card,
                boxShadow: t.shadow.status,
              }}>
              <Label variant="label" style={{ textAlign: 'center', opacity: busy === null ? 1 : look.was }}>
                {copy.claim}
              </Label>
            </PressableScale>
          </Animated.View>
          <PressableScale
            label={copy.fullPrice}
            haptic="tap"
            onPress={onFullPrice}
            style={{
              minHeight: t.control.full,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.radius.pill,
              borderWidth: t.stroke.selected,
              borderColor: t.surface.card,
            }}>
            <Label variant="label" tone="onAccent" style={{ textAlign: 'center' }}>
              {copy.fullPrice}
            </Label>
          </PressableScale>
        </View>
      </Reveal>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: t.space.xs,
          paddingTop: t.space.xs,
          paddingBottom: Math.max(0, insets.bottom / 2 - t.space.xl),
        }}>
        {links.map((link) => (
          <PressableScale
            key={link.label}
            label={link.label}
            haptic={link.label === subscriptionCopy.restore && busy !== null ? 'none' : 'tap'}
            onPress={link.onPress}
            style={{ minHeight: t.type.micro.lineHeight }}>
            <Label variant="micro" tone="onAccent" style={{ textDecorationLine: 'underline' }}>
              {link.label}
            </Label>
          </PressableScale>
        ))}
      </View>
    </>
  );
}

function openLink(url: string) {
  void Linking.openURL(url).catch(() => notify(subscriptionCopy.linkError));
}

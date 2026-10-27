import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, CloseButton, Label, PressableScale, PrimaryButton, ScreenShell } from '../../ui';
import { notify } from '../../ui/Notice';
import { haptic, scheduleHaptic } from '../../ui/haptics';
import { useMotion } from '../../ui/useMotion';
import { Reveal } from '../../ui/Reveal';
import { opacityIn } from '../../ui/presets';
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
  look = { cardAt: 420, count: 900, from: 0.6, glow: 14, closeAt: 1400, ctaAt: 2200, breath: 1.035 } as const;

type Offer = { generation: number; product: PaywallProduct; percent: number; anchor: string };

export function CloseOfferScreen({
  onAccess,
  onLeave,
  reportError,
}: {
  onAccess: (entitlement: Entitlement) => void;
  onLeave: () => void;
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
  return (
    <ScreenShell
      contentStyle={{ gap: t.space.xl, paddingTop: insets.top + t.space.xl }}
      footer={
        offer ? (
          <OfferFooter
            offer={offer}
            busy={busy}
            onClaim={() => void claim()}
            onRestore={() => {
              if (busy === null) void restore();
            }}
          />
        ) : null
      }>
      {offer ? <OfferHero percent={offer.percent} onClose={close} /> : null}
    </ScreenShell>
  );
}

function OfferHero({ percent, onClose }: { percent: number; onClose: () => void }) {
  const m = useMotion(),
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
  return (
    <>
      <View>
        <Reveal index={0}>
          <BrandMark name="ExcerLock" />
        </Reveal>
        <Animated.View entering={opacityIn('emphasized', look.closeAt)} style={{ position: 'absolute', top: closeTop, right: 0 }}>
          <CloseButton onPress={onClose} />
        </Animated.View>
      </View>
      <Reveal index={1}>
        <View accessible accessibilityRole="header" style={{ alignItems: 'center', gap: t.space.xs }}>
          <Label variant="display" style={{ textAlign: 'center' }}>
            {copy.eyebrow}
          </Label>
          <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
            {copy.never}
          </Label>
        </View>
      </Reveal>
      <Animated.View
        accessible
        accessibilityLabel={copy.a11y(percent)}
        style={[
          {
            alignItems: 'center',
            marginHorizontal: t.space.xxl,
            paddingTop: t.space.lg,
            paddingBottom: t.space.xl,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.softChoice,
          },
          card,
        ]}>
        <HotWord text={copy.percent(value)} variant="deal" glow={look.glow} shineDelay={look.cardAt + look.count} />
        <Label variant="display" style={{ textAlign: 'center' }}>
          {copy.discount}
        </Label>
      </Animated.View>
      <Reveal index={4}>
        <View style={{ alignItems: 'center', gap: t.space.sm }}>
          <Label variant="label" style={{ textAlign: 'center' }}>
            {copy.expires}
          </Label>
          <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
            {copy.gone(percent)}
          </Label>
        </View>
      </Reveal>
    </>
  );
}

const closeTop = (t.type.brand.lineHeight - t.control.inline) / 2;

function OfferFooter({
  offer,
  busy,
  onClaim,
  onRestore,
}: {
  offer: Offer;
  busy: 'purchase' | 'restore' | null;
  onClaim: () => void;
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
      <Reveal index={6}>
        <View style={{ gap: t.space.md, paddingTop: length ? t.space.md : 0, paddingBottom: t.space.sm }}>
          <View>
            <View
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: true, selected: true }}
              accessibilityLabel={`${copy.plan} · ${monthly}`}
              style={{
                minHeight: t.control.full,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: t.space.md,
                paddingHorizontal: t.space.xl,
                borderRadius: t.radius.pill,
                backgroundColor: t.brand.primary,
              }}>
              <Label variant="label" tone="onAccent">
                {copy.plan}
              </Label>
              <Label variant="label" tone="onAccent">
                {monthly}
              </Label>
            </View>
            {length ? (
              <View pointerEvents="none" style={{ position: 'absolute', top: -t.control.indicator / 2, left: 0, right: 0, alignItems: 'center' }}>
                <View
                  style={{
                    height: t.control.indicator,
                    justifyContent: 'center',
                    paddingHorizontal: t.space.md,
                    borderRadius: t.radius.pill,
                    borderWidth: t.stroke.hairline,
                    borderColor: t.border.outline,
                    backgroundColor: t.surface.card,
                  }}>
                  <Label variant="micro">{copy.badge(length)}</Label>
                </View>
              </View>
            ) : null}
          </View>
          <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
            {copy.billed(product.localizedPrice, length, offer.anchor)}
          </Label>
        </View>
      </Reveal>
      <Reveal index={7}>
        <Animated.View style={pulse}>
          <PrimaryButton label={copy.claim} loading={busy !== null} onPress={onClaim} />
        </Animated.View>
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
            <Label variant="micro" tone="secondary" style={{ textDecorationLine: 'underline' }}>
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

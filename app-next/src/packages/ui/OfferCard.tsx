import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useFlyToTarget } from './FlyToTarget';
import { haptic } from './haptics';
import { Label } from './Label';
import { PointsLabel } from './PointsPill';
import { PointsToken } from './PointsToken';
import { PressableScale } from './PressableScale';
import { formatPoints } from './RollingNumber';
import { formatOffer, rewards, type PointsActivity } from './rewardsCopy';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

const Arc = Animated.createAnimatedComponent(Circle);
const r = t.motion.reward;

export type OfferCardOffer = { id: string; price: number; minutes: number };
export type OfferPurchase = 'bought' | 'insufficient';

export function RewardChip({ text }: { text: string }) {
  return (
    <View
      style={{
        height: t.points.chip,
        paddingHorizontal: t.space.lg,
        borderRadius: t.radius.pill,
        backgroundColor: t.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: t.shadow.cta,
      }}>
      <Label variant="label" tone="onAccent">
        {text}
      </Label>
    </View>
  );
}

function TokenRing({ activity, progress }: { activity: PointsActivity; progress: number }) {
  const m = useMotion();
  const size = t.points.ring,
    stroke = t.points.ringStroke,
    radius = (size - stroke) / 2,
    length = 2 * Math.PI * radius,
    p = useSharedValue(0);
  useEffect(() => {
    p.set(m.timing(Math.min(1, Math.max(0, progress)), 'emphasized'));
  }, [progress, p, m]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.get()) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={t.border.divider} strokeWidth={stroke} fill="none" />
        <Arc
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.brand.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[length, length]}
          animatedProps={props}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ opacity: r.dim }}>
        <PointsToken activity={activity} size={t.points.card - t.space.xs} />
      </View>
    </View>
  );
}

export function OfferCard({
  offer,
  activity,
  points,
  toGo,
  target = 'home',
  bankEmpty = false,
  onBuy,
}: {
  offer: OfferCardOffer;
  activity: PointsActivity;
  points: number;
  toGo: number;
  target?: string;
  bankEmpty?: boolean;
  onBuy: () => OfferPurchase;
}) {
  const m = useMotion();
  const fly = useFlyToTarget();
  const ref = useRef<View>(null);
  const [confirmRequested, setConfirming] = useState(false);
  const shake = useSharedValue(0);
  const affordable = points >= offer.price;
  const confirming = confirmRequested && affordable;
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), r.confirm);
    return () => clearTimeout(timer);
  }, [confirming]);
  const refuse = () => {
    haptic('warning');
    if (m.reduced) return;
    const beat = { duration: r.shakeBeat };
    shake.set(
      withSequence(
        withTiming(r.shake, beat),
        withTiming(-r.shake, beat),
        withTiming(r.shake * 0.66, beat),
        withTiming(-r.shake * 0.66, beat),
        withTiming(r.shake * 0.33, beat),
        withTiming(-r.shake * 0.33, beat),
        withTiming(0, beat),
      ),
    );
  };
  const press = () => {
    if (!affordable) return refuse();
    if (!confirming) {
      haptic('tap');
      return setConfirming(true);
    }
    setConfirming(false);
    if (onBuy() === 'insufficient') return refuse();
    return fly({
      from: ref,
      to: target,
      count: 1,
      size: t.points.chip,
      delay: r.roll,
      haptic: bankEmpty ? 'unlock' : 'success',
      token: () => <RewardChip text={rewards.bought(offer.minutes)} />,
    });
  };
  const shaking = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const tone = confirming ? 'onAccent' : 'primary';
  return (
    <Animated.View ref={ref} collapsable={false} style={[{ flex: 1 }, shaking]}>
      <PressableScale
        label={
          confirming
            ? rewards.confirmLabel(offer.minutes, offer.price)
            : affordable
              ? rewards.offerLabel(offer.minutes, offer.price)
              : `${rewards.offerLabel(offer.minutes, offer.price)}, ${rewards.toGo(activity, toGo)}`
        }
        haptic="none"
        onPress={() => void press()}>
        <Animated.View
          style={{
            height: t.layout.cardWidth - t.space.xxl,
            borderRadius: t.radius.card,
            backgroundColor: confirming ? t.brand.primary : t.surface.softChoice,
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space.xs,
            ...m.transition('backgroundColor', 'standard'),
          }}>
          <View style={{ opacity: affordable ? 1 : r.dim }}>
            <Label variant="metricSmall" tone={tone} style={{ textAlign: 'center' }}>
              {formatOffer(offer.minutes)}
            </Label>
          </View>
          {confirming ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs }}>
              <Label variant="label" tone="onAccent">
                {`${rewards.buy} ·`}
              </Label>
              <PointsLabel activity={activity} points={offer.price} tone="onAccent" />
            </View>
          ) : affordable ? (
            <PointsLabel activity={activity} points={offer.price} />
          ) : (
            <View style={{ alignItems: 'center', gap: t.space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs }}>
                <TokenRing activity={activity} progress={points / offer.price} />
                <Label variant="label" style={{ opacity: r.dim }}>
                  {formatPoints(offer.price)}
                </Label>
              </View>
              <Label variant="support" tone="secondary">
                {rewards.toGo(activity, toGo)}
              </Label>
            </View>
          )}
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { useFlyTarget, useLandingValue } from './FlyToTarget';
import { RewardChip } from './OfferCard';
import { RollingNumber } from './RollingNumber';
import { formatBank, rewards } from './rewardsCopy';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

const Hand = Animated.createAnimatedComponent(Line);
const r = t.motion.reward;
const glyph = t.points.pill;
const enter = Easing.bezier(...t.motion.easing.enter);

function BankGlyph({ turns }: { turns: number }) {
  const m = useMotion();
  const sweep = useSharedValue(turns);
  useEffect(() => {
    sweep.set(m.reduced ? turns : withTiming(turns, { duration: r.sweep, easing: enter }));
  }, [turns, sweep, m.reduced]);
  const c = glyph / 2;
  const minute = useAnimatedProps(() => {
    const angle = sweep.get() * Math.PI * 2;
    return { x2: c + Math.sin(angle) * c * 0.52, y2: c - Math.cos(angle) * c * 0.52 };
  });
  return (
    <Svg width={glyph} height={glyph}>
      <Circle cx={c} cy={c} r={c} fill={t.brand.primary} />
      <Line x1={c} y1={c} x2={c + c * 0.34} y2={c} stroke={t.text.onAccent} strokeWidth={t.stroke.chart * 0.8} strokeLinecap="round" />
      <Hand x1={c} y1={c} animatedProps={minute} stroke={t.text.onAccent} strokeWidth={t.stroke.chart * 0.8} strokeLinecap="round" />
    </Svg>
  );
}

function Gain({ minutes, onDone }: { minutes: number; onDone: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withSequence(
        withSpring(1, t.motion.spring.pop),
        withDelay(r.gainHold, withTiming(2, { duration: t.motion.duration.standard, easing: Easing.in(Easing.quad) })),
      ),
    );
    const timer = setTimeout(onDone, r.gainHold + t.motion.duration.emphasized * 2);
    return () => clearTimeout(timer);
  }, [p, onDone]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    const rise = Math.min(v, 1);
    const leave = Math.max(0, v - 1);
    return {
      opacity: Math.min(1, rise * 3) * (1 - leave),
      transform: [{ translateY: -t.points.chip + rise * (t.points.chip + r.gainRise) + leave * r.gainRise }, { scale: 0.5 + 0.5 * rise }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: '100%', left: -t.space.xxl, right: -t.space.xxl, alignItems: 'center' }, style]}>
      <RewardChip text={rewards.bought(minutes)} />
    </Animated.View>
  );
}

export function BankChip({ minutes, target = 'shop-bank' }: { minutes: number; target?: string }) {
  const m = useMotion();
  const { ref, anchor, style } = useFlyTarget(target, r.pulse, r.grow);
  const shown = useLandingValue(target, minutes, 'end');
  const last = useRef(shown);
  const [gain, setGain] = useState<{ key: number; minutes: number } | null>(null);
  const [turns, setTurns] = useState(0);
  const clear = useCallback(() => setGain(null), []);
  useEffect(() => {
    const added = shown - last.current;
    last.current = shown;
    if (added <= 0 || m.reduced) return;
    setGain({ key: Date.now(), minutes: added });
    setTurns((value) => value + 1);
  }, [shown, m.reduced]);
  return (
    <View style={{ zIndex: 1 }}>
      {gain ? <Gain key={gain.key} minutes={gain.minutes} onDone={clear} /> : null}
      <Animated.View
        ref={ref}
        collapsable={false}
        accessible
        accessibilityLabel={rewards.bankLabel(minutes)}
        style={[
          {
            height: t.control.indicator + t.space.xs,
            paddingLeft: t.space.sm - t.space.xs / 2,
            paddingRight: t.space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.xs + t.space.xs / 2,
            borderRadius: t.radius.pill,
            backgroundColor: t.surface.softChoice,
          },
          style,
        ]}>
        <View ref={anchor} collapsable={false}>
          <BankGlyph turns={turns} />
        </View>
        <RollingNumber value={shown} format={formatBank} variant="label" unitTone="secondary" />
      </Animated.View>
    </View>
  );
}

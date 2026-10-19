import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';
import { useFlyTarget, useLandingValue } from './FlyToTarget';
import { Label } from './Label';
import { RollingNumber } from './RollingNumber';
import { formatBankLeft, rewards } from './rewardsCopy';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

const Surface = Animated.createAnimatedComponent(Path);
const Bubble = Animated.createAnimatedComponent(Circle);
const restingSwell = 7;
const segments = 32;
const minimumLevel = 0.11;
const highestLevel = 0.86;
const rim = 3;
const ticks = [0.25, 0.5, 0.75];
const bubbles = [
  { x: 0.22, r: 4, offset: 0 },
  { x: 0.41, r: 2.5, offset: 0.55 },
  { x: 0.63, r: 3.5, offset: 0.3 },
  { x: 0.8, r: 2, offset: 0.8 },
];

export const bankLevel = (minutes: number, fullMinutes: number) =>
  minutes <= 0 ? 0 : minimumLevel + (highestLevel - minimumLevel) * Math.min(1, minutes / fullMinutes);

function surfaceY(height: number, level: number, amplitude: number, phase: number, cycles: number, i: number) {
  'worklet';
  const surface = height * (1 - Math.max(0, level));
  const swell = Math.min(Math.abs(amplitude), (height - surface) * 0.4) * Math.sign(amplitude);
  return surface + swell * Math.sin(phase + (i / segments) * Math.PI * 2 * cycles);
}

function crestPath(width: number, height: number, level: number, amplitude: number, phase: number, cycles: number) {
  'worklet';
  let d = `M0 ${surfaceY(height, level, amplitude, phase, cycles, 0)}`;
  for (let i = 1; i <= segments; i += 1) d += ` L${(width * i) / segments} ${surfaceY(height, level, amplitude, phase, cycles, i)}`;
  return d;
}

function wavePath(width: number, height: number, level: number, amplitude: number, phase: number, cycles: number) {
  'worklet';
  let d = `M0 ${height} L0 ${surfaceY(height, level, amplitude, phase, cycles, 0)}`;
  for (let i = 1; i <= segments; i += 1) d += ` L${(width * i) / segments} ${surfaceY(height, level, amplitude, phase, cycles, i)}`;
  return `${d} L${width} ${height} Z`;
}

export function BankHero({
  minutes,
  target = 'bank',
  fullMinutes = 12 * 60,
  compact = false,
}: {
  minutes: number;
  target?: string;
  fullMinutes?: number;
  compact?: boolean;
}) {
  const m = useMotion();
  const { ref, style } = useFlyTarget(target, t.motion.scale.selected);
  const shown = useLandingValue(target, minutes);
  const [width, setWidth] = useState(0);
  const screen = useWindowDimensions();
  const height = compact
    ? t.points.bankCompact
    : Math.min(t.points.bank, Math.round(screen.height * t.points.bankShare));
  const level = useSharedValue(bankLevel(shown, fullMinutes));
  const slosh = useSharedValue(0);
  const flow = useSharedValue(0);
  const goal = bankLevel(shown, fullMinutes);
  useEffect(() => {
    if (m.reduced) {
      level.set(goal);
      return;
    }
    const rising = goal >= level.get() ? 1 : -1;
    level.set(withSpring(goal, t.motion.spring.level));
    slosh.set(
      withSequence(
        withTiming(t.motion.reward.slosh * rising, { duration: t.motion.duration.press }),
        withSpring(0, t.motion.spring.slosh),
      ),
    );
  }, [goal, level, slosh, m.reduced]);
  useEffect(() => {
    if (m.reduced) {
      flow.set(0);
      return;
    }
    flow.set(0);
    flow.set(withRepeat(withTiming(1, { duration: t.motion.reward.flow, easing: Easing.linear }), -1, false));
  }, [flow, m.reduced]);
  const backLevel = () => {
    'worklet';
    return level.get() + 0.03 * Math.min(1, level.get() / minimumLevel);
  };
  const back = useAnimatedProps(() => ({
    d: wavePath(width, height, backLevel(), restingSwell * 0.8 + slosh.get() * 0.7, Math.PI * 0.85 - flow.get() * Math.PI * 2, 0.7),
  }));
  const front = useAnimatedProps(() => ({
    d: wavePath(width, height, level.get(), restingSwell - slosh.get(), Math.PI * 0.15 + flow.get() * Math.PI * 2, 0.85),
  }));
  const crest = useAnimatedProps(() => ({
    d: crestPath(width, height, level.get(), restingSwell - slosh.get(), Math.PI * 0.15 + flow.get() * Math.PI * 2, 0.85),
    strokeOpacity: level.get() > 0 ? 0.85 : 0,
  }));
  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityLabel={rewards.bankLeftLabel(minutes)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          height,
          borderRadius: t.radius.card,
          backgroundColor: t.surface.softChoice,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {width ? (
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id="bank-liquid" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.brand.light} />
              <Stop offset="1" stopColor={t.brand.primary} stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          <Surface animatedProps={back} fill={t.brand.track} />
          <Surface animatedProps={front} fill="url(#bank-liquid)" />
          {bubbles.map((bubble, index) => (
            <RisingBubble key={index} {...bubble} width={width} height={height} level={level} flow={flow} />
          ))}
          <Surface animatedProps={crest} fill="none" stroke={t.surface.card} strokeWidth={rim} strokeLinecap="round" />
          {ticks.map((tick) => (
            <Line
              key={tick}
              x1={width - t.space.lg - t.space.md}
              x2={width - t.space.lg}
              y1={height * (1 - tick)}
              y2={height * (1 - tick)}
              stroke={t.surface.card}
              strokeOpacity={0.9}
              strokeWidth={rim}
              strokeLinecap="round"
            />
          ))}
          <Rect
            x={t.space.lg}
            y={height * 0.14}
            width={t.space.sm}
            height={height * 0.42}
            rx={t.space.xs}
            fill={t.surface.card}
            fillOpacity={0.7}
          />
          <Circle cx={t.space.lg + t.space.xs} cy={height * 0.66} r={t.space.xs} fill={t.surface.card} fillOpacity={0.7} />
          <Rect
            x={rim / 2}
            y={rim / 2}
            width={width - rim}
            height={height - rim}
            rx={t.radius.card - rim / 2}
            fill="none"
            stroke={t.surface.card}
            strokeOpacity={0.9}
            strokeWidth={rim}
          />
        </Svg>
      ) : null}
      <View style={{ alignItems: 'center', gap: t.space.xs, paddingBottom: compact ? 0 : t.space.sm }}>
        <RollingNumber
          value={shown}
          format={formatBankLeft}
          variant={compact ? 'metricSmall' : 'metric'}
          unitTone="secondary"
        />
        <Label variant="support" tone="secondary">
          {rewards.bankLeft}
        </Label>
      </View>
    </Animated.View>
  );
}

function RisingBubble({
  x,
  r,
  offset,
  width,
  height,
  level,
  flow,
}: {
  x: number;
  r: number;
  offset: number;
  width: number;
  height: number;
  level: SharedValue<number>;
  flow: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => {
    const depth = height * Math.max(0, level.get());
    const rise = (flow.get() * 2 + offset) % 1;
    return {
      cy: height - r - rise * Math.max(0, depth - r * 4),
      fillOpacity: depth > r * 6 ? 0.6 * Math.sin(rise * Math.PI) : 0,
    };
  });
  return <Bubble animatedProps={props} cx={width * x} r={r} fill={t.surface.card} />;
}

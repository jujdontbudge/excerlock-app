import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useFlyTarget, useLandingValue } from './FlyToTarget';
import { Label } from './Label';
import { RollingNumber } from './RollingNumber';
import { formatBank, rewards } from './rewardsCopy';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

const Surface = Animated.createAnimatedComponent(Path);
const restingSwell = 7;
const segments = 32;
const minimumLevel = 0.11;
const highestLevel = 0.86;

export const bankLevel = (minutes: number, fullMinutes: number) =>
  minutes <= 0 ? 0 : minimumLevel + (highestLevel - minimumLevel) * Math.min(1, minutes / fullMinutes);

function wavePath(width: number, height: number, level: number, amplitude: number, phase: number, cycles: number) {
  'worklet';
  const surface = height * (1 - Math.max(0, level));
  const depth = height - surface;
  const swell = Math.min(Math.abs(amplitude), depth * 0.4) * Math.sign(amplitude);
  const y = (i: number) => surface + swell * Math.sin(phase + (i / segments) * Math.PI * 2 * cycles);
  let d = `M0 ${height} L0 ${y(0)}`;
  for (let i = 1; i <= segments; i += 1) d += ` L${(width * i) / segments} ${y(i)}`;
  return `${d} L${width} ${height} Z`;
}

export function BankHero({
  minutes,
  target = 'bank',
  fullMinutes = 12 * 60,
}: {
  minutes: number;
  target?: string;
  fullMinutes?: number;
}) {
  const m = useMotion();
  const { ref, style } = useFlyTarget(target, t.motion.scale.selected);
  const shown = useLandingValue(target, minutes);
  const [width, setWidth] = useState(0);
  const height = t.points.bank;
  const level = useSharedValue(bankLevel(shown, fullMinutes));
  const slosh = useSharedValue(0);
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
  const back = useAnimatedProps(() => ({
    d: wavePath(width, height, level.get() + 0.03 * Math.min(1, level.get() / minimumLevel), restingSwell * 0.8 + slosh.get() * 0.7, Math.PI * 0.85, 0.7),
  }));
  const front = useAnimatedProps(() => ({
    d: wavePath(width, height, level.get(), restingSwell - slosh.get(), Math.PI * 0.15, 0.85),
  }));
  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityLabel={rewards.bankLabel(minutes)}
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
          <Surface animatedProps={back} fill={t.brand.track} />
          <Surface animatedProps={front} fill={t.brand.light} />
        </Svg>
      ) : null}
      <View style={{ alignItems: 'center', gap: t.space.xs, paddingBottom: t.space.sm }}>
        <RollingNumber value={shown} format={formatBank} variant="metric" unitTone="secondary" />
        <Label variant="support" tone="secondary">
          {rewards.bank}
        </Label>
      </View>
    </Animated.View>
  );
}

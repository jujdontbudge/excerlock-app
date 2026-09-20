import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 224;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyActivityRing({ value, goal, unit, dayLabel }: {
  value: number;
  goal: number;
  unit: string;
  dayLabel: string;
}) {
  const progress = useSharedValue(0);
  const motion = useMotion();
  const ratio = goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0;
  useEffect(() => {
    progress.set(motion.reduced ? ratio : withTiming(ratio, { duration: t.motion.duration.tick }));
  }, [motion.reduced, progress, ratio]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.get()),
  }));
  return (
    <View accessible accessibilityLabel={unit === 'steps' ? 'Daily steps ring' : 'Daily gym ring'} style={s.card}>
      <View style={s.ring}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={t.surface.well} strokeWidth={STROKE} />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={t.brand.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={s.center}>
          <Label variant="support" tone="secondary">{dayLabel}</Label>
          <Label variant="metric">{Math.round(value).toLocaleString('en-US')}</Label>
          <Label variant="support" tone="secondary">of {Math.round(goal).toLocaleString('en-US')} {unit}</Label>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: t.space.md },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});

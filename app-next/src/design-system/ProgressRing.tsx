import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { useMotion } from '../motion/useMotion';
import { format } from '../content/format';
const Arc = Animated.createAnimatedComponent(Circle);
export function ProgressRing({ value, label, size = t.layout.ring }: { value: number; label: string; size?: number }) {
  const progress = Math.min(1, Math.max(0, value)),
    p = useSharedValue(0),
    m = useMotion();
  const radius = (size - t.layout.progress) / 2,
    length = 2 * Math.PI * radius;
  useEffect(() => {
    p.set(m.reduced ? progress : withTiming(progress, { duration: m.duration.reveal }));
  }, [progress, p, m.reduced, m.duration.reveal]);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - p.get()),
  }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: progress * 100 }}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.chart.grid}
          strokeWidth={t.layout.progress}
          fill="none"
        />
        <Arc
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.brand.primary}
          strokeWidth={t.layout.progress}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[length, length]}
          animatedProps={props}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Label variant="label">{format.percent(progress)}</Label>
    </View>
  );
}

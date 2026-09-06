import { useEffect } from 'react';
import { fadeIn, fadeOut } from '../motion/presets';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const progress = Math.min(1, Math.max(0, value)),
    p = useSharedValue(0);
  const m = useMotion();
  useEffect(() => {
    p.set(
      m.reduced
        ? progress
        : withTiming(progress, {
            duration: m.reduced ? m.duration.fast : m.duration.reveal,
          }),
    );
  }, [progress, p, m.reduced, m.duration.fast, m.duration.reveal]);
  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));
  return (
    <Animated.View
      key={m.reduced ? progress : 'progress'}
      entering={fadeIn}
      exiting={fadeOut}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: progress * 100 }}
      style={{
        height: t.layout.progress,
        backgroundColor: t.chart.grid,
        borderRadius: t.radius.pill,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: t.brand.primary,
            borderRadius: t.radius.pill,
          },
          fill,
        ]}
      />
    </Animated.View>
  );
}

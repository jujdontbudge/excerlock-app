import { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { feedback } from '../motion/haptics';
import { tokens as t } from './tokens';
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const width = useSharedValue(1),
    ratio = useSharedValue((value - min) / (max - min)),
    last = useSharedValue(value);
  useEffect(() => {
    ratio.set(withSpring((value - min) / (max - min), t.motion.spring.control));
    last.set(value);
  }, [value, min, max, ratio, last]);
  const commit = useCallback(
    (next: number) => {
      feedback();
      onChange(Math.min(max, Math.max(min, next)));
    },
    [max, min, onChange],
  );
  const gesture = useMemo(() => {
    const track = (e: { x: number }) => {
      'worklet';
      const r = Math.min(1, Math.max(0, (e.x - t.layout.thumb / 2) / Math.max(1, width.get() - t.layout.thumb)));
      ratio.set(r);
      const next = Math.min(max, Math.max(min, min + Math.round((r * (max - min)) / step) * step));
      if (next !== last.get()) {
        last.set(next);
        scheduleOnRN(commit, next);
      }
    };
    return Gesture.Pan().withTestId(label).minDistance(0).onBegin(track).onUpdate(track);
  }, [width, ratio, min, max, step, last, commit, label]);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: ratio.get() * (width.get() - t.layout.thumb) }],
  }));
  const fill = useAnimatedStyle(() => ({ width: `${ratio.get() * 100}%` }));
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => commit(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
      onLayout={(e) => {
        width.set(e.nativeEvent.layout.width);
      }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={{ height: t.control.inline, justifyContent: 'center' }}>
          <View
            style={{
              height: t.layout.progress,
              borderRadius: t.radius.pill,
              backgroundColor: t.chart.grid,
            }}>
            <Animated.View
              style={[
                {
                  height: '100%',
                  borderRadius: t.radius.pill,
                  backgroundColor: t.brand.primary,
                },
                fill,
              ]}
            />
          </View>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: t.layout.thumb,
                height: t.layout.thumb,
                borderRadius: t.radius.pill,
                backgroundColor: t.brand.primary,
                borderWidth: t.stroke.chart,
                borderColor: t.surface.card,
                boxShadow: t.shadow.cta,
              },
              thumb,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

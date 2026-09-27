import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useMotion } from '../useMotion';
import { feedback } from '../haptics';
import { tokens as t } from '../tokens';
import { Label } from '../Label';

const minorTicksPerPound = 5;
const spacing = t.space.md * minorTicksPerPound;
const precision = 10;
const rulerHeight = t.control.row;

export function RulerSlider({
  label,
  caption,
  unit,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  caption: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const m = useMotion();
  const animate = m.spring;
  const count = Math.round((max - min) / step);
  const stepWidth = spacing * step;
  const maxOffset = count * stepWidth;
  const clampIndex = (next: number) => Math.min(count, Math.max(0, Math.round((next - min) / step)));
  const [shown, setShown] = useState(value);
  const width = useSharedValue(0),
    offset = useSharedValue(clampIndex(value) * stepWidth),
    start = useSharedValue(0);
  const tick = useCallback((index: number) => {
    setShown(Number((min + index * step).toFixed(1)));
    if (index % precision === 0) feedback('selection');
  }, [min, step]);
  const commit = useCallback((index: number) => onChange(Number((min + index * step).toFixed(1))), [min, step, onChange]);
  useAnimatedReaction(
    () => Math.min(count, Math.max(0, Math.round(offset.get() / stepWidth))),
    (current, previous) => {
      if (previous !== null && current !== previous) scheduleOnRN(tick, current);
    },
    [count, stepWidth],
  );
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(label)
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          cancelAnimation(offset);
          start.set(offset.get());
        })
        .onUpdate((e) => {
          offset.set(Math.min(maxOffset, Math.max(0, start.get() - e.translationX)));
        })
        .onEnd((e) => {
          const projected = offset.get() - e.velocityX * (t.motion.duration.press / 1000);
          const index = Math.min(count, Math.max(0, Math.round(projected / stepWidth)));
          const target = index * stepWidth;
          offset.set(animate(target, 'control'));
          scheduleOnRN(commit, index);
        }),
    [label, offset, start, maxOffset, count, stepWidth, animate, commit],
  );
  const content = useAnimatedStyle(() => ({ transform: [{ translateX: width.get() / 2 - offset.get() }] }));
  const shade = useAnimatedStyle(() => ({ width: offset.get() }));
  const ticks = useMemo(() => Array.from({ length: Math.round((max - min) * minorTicksPerPound) + 1 }, (_, index) => index), [max, min]);
  const adjust = (direction: 1 | -1) => {
    const index = clampIndex(value + direction * step);
    offset.set(animate(index * stepWidth, 'control'));
    commit(index);
  };
  return (
    <View style={{ alignItems: 'center', gap: t.space.xl }}>
      <View style={{ alignItems: 'center', gap: t.space.xs }}>
        <Label variant="label" style={{ textAlign: 'center' }}>
          {caption}
        </Label>
        <Label variant="metric" style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {`${shown.toFixed(1)} ${unit}`}
        </Label>
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: `${shown.toFixed(1)} ${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => adjust(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={(e) => width.set(e.nativeEvent.layout.width)}
        style={{ alignSelf: 'stretch', marginHorizontal: -t.layout.page, height: rulerHeight, overflow: 'hidden' }}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={{ flex: 1 }}>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: maxOffset }, content]}>
              <Animated.View
                style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: t.brand.track }, shade]}
              />
              {ticks.map((index) => {
                const major = index % minorTicksPerPound === 0;
                return (
                  <View
                    key={index}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: index * (spacing / minorTicksPerPound) - t.stroke.hairline / 2,
                      width: major ? t.stroke.selected : t.stroke.hairline,
                      height: major ? t.control.inline : t.space.xl,
                      backgroundColor: major ? t.text.primary : t.border.mutedStroke,
                    }}
                  />
                );
              })}
            </Animated.View>
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center' }}>
              <View
                style={{
                  width: t.stroke.chart,
                  height: rulerHeight,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.brand.primary,
                }}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

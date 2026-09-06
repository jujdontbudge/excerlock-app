import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { useMotion } from '../motion/useMotion';
import { fadeIn, fadeOut } from '../motion/presets';
export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [width, setWidth] = useState(0),
    x = useSharedValue(0);
  const m = useMotion();
  const index = Math.max(0, options.indexOf(value));
  useEffect(() => {
    const target = (index * width) / options.length;
    x.set(m.reduced ? target : withSpring(target, t.motion.spring.control));
  }, [index, width, options.length, m.reduced, x]);
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        borderRadius: t.radius.field,
        backgroundColor: t.surface.subtle,
      }}>
      <Animated.View
        key={m.reduced ? value : 'indicator'}
        entering={fadeIn}
        exiting={fadeOut}
        style={[
          {
            position: 'absolute',
            top: t.space.xs,
            bottom: t.space.xs,
            width: width / options.length,
            borderRadius: t.radius.field,
            backgroundColor: t.surface.selected,
            borderWidth: t.stroke.hairline,
            borderColor: t.brand.light,
          },
          position,
        ]}
      />
      {options.map((option) => (
        <View key={option} style={{ flex: 1 }}>
          <PressableScale
            label={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: option === value }}
            onPress={() => onChange(option)}
            style={{
              paddingVertical: t.space.md,
              paddingHorizontal: t.space.xs,
              alignItems: 'center',
            }}>
            <Label
              variant="support"
              style={{
                color: option === value ? t.brand.primary : t.text.secondary,
                textAlign: 'center',
              }}>
              {option}
            </Label>
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

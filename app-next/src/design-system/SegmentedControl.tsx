import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { useMotion } from '../motion/useMotion';
import { fadeIn, fadeOut } from '../motion/presets';
export function SegmentedControl({
  options,
  value,
  onChange,
  prominent = false,
  variant = prominent ? 'prominent' : 'default',
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  prominent?: boolean;
  /** Every variant renders the app-wide look: black hairline track, full-height orange pill, white text on it. */
  variant?: 'default' | 'prominent' | 'outline';
}) {
  void variant;
  const pill = true,
    outline = true;
  const [width, setWidth] = useState(0),
    x = useSharedValue(0);
  const m = useMotion();
  const index = Math.max(0, options.indexOf(value));
  useEffect(() => {
    const target = (index * width) / options.length;
    x.set(m.spring(target, 'control'));
  }, [index, width, options.length, m, x]);
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        borderRadius: pill ? t.radius.pill : t.radius.field,
        backgroundColor: outline ? t.surface.transparent : t.surface.subtle,
        borderWidth: outline ? t.stroke.hairline : 0,
        borderColor: t.border.outline,
      }}>
      <Animated.View
        key={m.reduced ? value : 'indicator'}
        entering={fadeIn}
        exiting={fadeOut}
        style={[
          {
            position: 'absolute',
            top: outline ? 0 : t.space.xs,
            bottom: outline ? 0 : t.space.xs,
            width: width / options.length,
            borderRadius: pill ? t.radius.pill : t.radius.field,
            backgroundColor: pill ? t.brand.primary : t.surface.selected,
            borderWidth: t.stroke.hairline,
            borderColor: outline ? t.brand.primary : t.brand.light,
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
              justifyContent: 'center',
            }}>
            <Label
              variant={outline ? 'label' : 'support'}
              style={{
                color:
                  option === value ? (pill ? t.text.onAccent : t.text.primary) : t.text.secondary,
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

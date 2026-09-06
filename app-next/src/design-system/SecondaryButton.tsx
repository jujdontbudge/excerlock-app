import { useState } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { ButtonProps } from './PrimaryButton';
import { feedback } from '../motion/haptics';
import { useMotion } from '../motion/useMotion';
export function SecondaryButton({
  label,
  onPress,
  disabled,
  variant = 'secondary',
  testID,
}: ButtonProps & { variant?: 'secondary' | 'tertiary' }) {
  const [pressed, setPressed] = useState(false);
  const m = useMotion();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        feedback();
        onPress();
      }}>
      <Animated.View
        style={{
          minHeight: t.layout.button,
          padding: t.space.md,
          borderRadius: t.radius.cta,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'tertiary' ? t.surface.transparent : t.surface.selected,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? m.scale.pressed : 1 }],
          transitionProperty: ['transform', 'opacity'],
          transitionDuration: m.duration.press,
        }}>
        <Label variant="label" style={{ color: t.brand.primary, textAlign: 'center' }}>
          {label}
        </Label>
      </Animated.View>
    </Pressable>
  );
}

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
  accessibilityLabel,
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
      accessibilityLabel={accessibilityLabel ?? label}
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
          minHeight: t.control.full,
          padding: t.space.md,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'tertiary' ? t.surface.transparent : disabled ? t.state.disabledFill : t.surface.card,
          borderWidth: variant === 'tertiary' ? 0 : t.stroke.hairline,
          borderColor: disabled ? t.state.disabledFill : t.border.outline,
          transform: [{ scale: pressed ? m.scale.pressed : 1 }],
          ...m.transition(['transform', 'backgroundColor', 'borderColor'], 'press'),
        }}>
        <Label variant="label" style={{ color: disabled ? t.state.disabledText : t.text.primary, textAlign: 'center' }}>
          {label}
        </Label>
      </Animated.View>
    </Pressable>
  );
}

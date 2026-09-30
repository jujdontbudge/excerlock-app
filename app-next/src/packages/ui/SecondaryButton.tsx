import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { ButtonProps } from './PrimaryButton';
import { feedback } from './haptics';
import { useMotion } from './useMotion';
export function SecondaryButton({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  loading = false,
  variant = 'secondary',
  testID,
  leading,
}: ButtonProps & { variant?: 'secondary' | 'tertiary'; leading?: ReactNode }) {
  const [pressed, setPressed] = useState(false);
  const m = useMotion();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled}
      onPressIn={() => setPressed(!loading)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (loading) return;
        feedback();
        onPress();
      }}>
      <Animated.View
        style={{
          minHeight: t.control.full,
          padding: t.space.md,
          paddingHorizontal: leading ? t.control.inline : t.space.md,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'tertiary' ? t.surface.transparent : disabled ? t.state.disabledFill : t.surface.card,
          borderWidth: variant === 'tertiary' ? 0 : t.stroke.hairline,
          borderColor: disabled ? t.state.disabledFill : t.border.outline,
          transform: [{ scale: pressed ? m.scale.pressed : 1 }],
          ...m.transition(['transform', 'backgroundColor', 'borderColor'], 'press'),
        }}>
        {leading ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: t.space.lg,
              width: t.icon.md,
              height: t.icon.md,
              justifyContent: 'center',
            }}>
            {leading}
          </View>
        ) : null}
        <Label variant="label" style={{ color: disabled ? t.state.disabledText : t.text.primary, textAlign: 'center' }}>
          {label}
        </Label>
      </Animated.View>
    </Pressable>
  );
}

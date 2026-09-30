import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';
import { feedback } from './haptics';
export type ButtonProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  shape?: 'pill' | 'rounded';
};
export function PrimaryButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  loading = false,
  testID,
  shape = 'pill',
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const m = useMotion();
  const unavailable = disabled;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable || loading, busy: loading }}
      disabled={unavailable}
      onPressIn={() => setPressed(!loading)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (loading) return;
        feedback('press');
        onPress();
      }}>
      <Animated.View
        style={[
          s.button,
          {
            borderRadius: shape === 'rounded' ? t.radius.card : t.radius.pill,
            backgroundColor: unavailable ? t.state.disabledFill : pressed ? t.brand.pressed : t.brand.primary,
            transform: [{ scale: pressed ? m.scale.pressed : 1 }],
            ...m.transition(['transform', 'backgroundColor'], 'standard'),
          },
        ]}>
        <Label
          variant="label"
          style={{
            color: unavailable ? t.state.disabledText : t.text.onAccent,
            textAlign: 'center',
            flexShrink: 1,
            transform: [{ translateY: t.type.label.fontSize * t.optical.centre }],
          }}>
          {label}
        </Label>
      </Animated.View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: t.control.full,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: t.space.sm,
    boxShadow: t.shadow.cta,
  },
});

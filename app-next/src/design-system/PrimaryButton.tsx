import { fadeIn, fadeOut } from '../motion/presets';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
import { feedback } from '../motion/haptics';
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
  const unavailable = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        feedback('press');
        onPress();
      }}>
      <Animated.View
        style={[
          s.button,
          {
            borderRadius: shape === 'rounded' ? t.radius.card : t.radius.cta,
            backgroundColor: unavailable ? t.state.disabledFill : pressed ? t.brand.pressed : t.brand.primary,
            transform: [{ scale: pressed ? m.scale.pressed : 1 }],
            transitionProperty: ['transform', 'backgroundColor'],
            transitionDuration: m.duration.press,
          },
        ]}>
        {loading ? (
          <Animated.View entering={fadeIn} exiting={fadeOut}>
            <ActivityIndicator color={t.state.disabledText} />
          </Animated.View>
        ) : null}
        <Label
          variant="label"
          style={{
            color: unavailable ? t.state.disabledText : t.text.onAccent,
            textAlign: 'center',
            flexShrink: 1,
          }}>
          {label}
        </Label>
      </Animated.View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: t.layout.button,
    borderRadius: t.radius.cta,
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: t.space.sm,
    boxShadow: t.shadow.cta,
  },
});

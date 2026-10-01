import { PropsWithChildren, useState } from 'react';
import { Insets, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMotion } from './useMotion';
import { haptic, HapticIntent } from './haptics';
import { tokens as t } from './tokens';
export function PressableScale({
  children,
  label,
  style,
  haptic: intent = 'tap',
  ...props
}: PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    label: string;
    style?: StyleProp<ViewStyle>;
    haptic?: HapticIntent;
  }
>) {
  const [pressed, setPressed] = useState(false);
  const [slop, setSlop] = useState<Insets>();
  const m = useMotion();
  return (
    <Pressable
      {...props}
      hitSlop={props.hitSlop ?? slop}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        const x = Math.max(0, (t.control.inline - width) / 2);
        const y = Math.max(0, (t.control.inline - height) / 2);
        setSlop(x || y ? { top: y, bottom: y, left: x, right: x } : undefined);
        props.onLayout?.(e);
      }}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={label}
      onPressIn={(e) => {
        setPressed(true);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        haptic(intent);
        props.onPress?.(e);
      }}>
      <Animated.View
        style={[
          { minHeight: t.control.inline, justifyContent: 'center' },
          style,
          {
            transform: [{ scale: pressed ? m.scale.pressed : 1 }],
            ...m.transition(['transform', 'backgroundColor', 'borderColor'], 'press'),
          },
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

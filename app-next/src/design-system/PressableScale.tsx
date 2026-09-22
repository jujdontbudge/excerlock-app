import { PropsWithChildren, useState } from 'react';
import { Insets, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMotion } from '../motion/useMotion';
import { feedback } from '../motion/haptics';
import { tokens as t } from './tokens';
export function PressableScale({
  children,
  label,
  style,
  ...props
}: PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    label: string;
    style?: StyleProp<ViewStyle>;
  }
>) {
  const [pressed, setPressed] = useState(false);
  const [slop, setSlop] = useState<Insets>();
  const m = useMotion();
  return (
    <Pressable
      {...props}
      // A control drawn smaller than the touch minimum keeps a 44 x 44pt hit region.
      hitSlop={props.hitSlop ?? slop}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        const x = Math.max(0, (t.layout.touch - width) / 2);
        const y = Math.max(0, (t.layout.touch - height) / 2);
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
        feedback();
        props.onPress?.(e);
      }}>
      <Animated.View
        style={[
          { minHeight: t.layout.touch, justifyContent: 'center' },
          style,
          {
            transform: [{ scale: pressed ? m.scale.pressed : 1 }],
            transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
            transitionDuration: m.duration.press,
          },
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

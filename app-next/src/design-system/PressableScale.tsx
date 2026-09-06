import { PropsWithChildren, useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
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
  const m = useMotion();
  return (
    <Pressable
      {...props}
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

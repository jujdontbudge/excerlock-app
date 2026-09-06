import { useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, type PressableProps } from 'react-native-gesture-handler';
import Animated, { cubicBezier, useReducedMotion, type CSSStyle } from 'react-native-reanimated';

import { layout, motion } from './tokens';

export interface PressableScaleProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  contentStyle?: StyleProp<CSSStyle<ViewStyle>>;
  disabledOpacity?: number;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({
  children,
  contentStyle,
  disabled = false,
  disabledOpacity = 0.45,
  hitSlop = 8,
  onPressIn,
  onPressOut,
  pressedScale = 0.96,
  style,
  ...pressableProps
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View
        style={[
          {
            minHeight: layout.minimumTarget,
            minWidth: layout.minimumTarget,
            opacity: disabled ? disabledOpacity : pressed ? 0.92 : 1,
            transitionDuration: motion.duration.press,
            transitionProperty: reduceMotion ? 'opacity' : ['opacity', 'transform'],
            transitionTimingFunction: cubicBezier(0.16, 1, 0.3, 1),
            ...(reduceMotion
              ? {}
              : { transform: [{ scale: disabled ? 1 : pressed ? pressedScale : 1 }] }),
          },
          contentStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

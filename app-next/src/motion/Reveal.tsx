import { PropsWithChildren } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMotion } from './useMotion';
import { fadeOut, layoutTransition, slideUp } from './presets';
export function Reveal({
  children,
  index = 0,
  style,
}: PropsWithChildren<{ index?: number; style?: StyleProp<ViewStyle> }>) {
  const m = useMotion();
  return (
    <Animated.View
      collapsable={false}
      entering={slideUp(m.reduced, index)}
      exiting={fadeOut}
      layout={layoutTransition}
      style={style}>
      {children}
    </Animated.View>
  );
}

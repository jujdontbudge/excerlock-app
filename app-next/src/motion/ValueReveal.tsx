import { StyleProp, ViewStyle } from 'react-native';
import { PropsWithChildren, useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
import { tokens as t } from '../design-system/tokens';
export function ValueReveal({
  value,
  children,
  style: containerStyle,
}: PropsWithChildren<{ value: string; style?: StyleProp<ViewStyle> }>) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(0);
    opacity.set(withTiming(1, { duration: t.motion.duration.standard, reduceMotion: ReduceMotion.Never }));
  }, [value, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[containerStyle, style]}>{children}</Animated.View>;
}

import { PropsWithChildren, useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
import { tokens as t } from '../design-system/tokens';
/** Keep the accessible node mounted while each changed value fades in at the same baseline. */
export function ValueReveal({ value, children }: PropsWithChildren<{ value: string }>) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(0);
    opacity.set(withTiming(1, { duration: t.motion.duration.fast, reduceMotion: ReduceMotion.Never }));
  }, [value, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

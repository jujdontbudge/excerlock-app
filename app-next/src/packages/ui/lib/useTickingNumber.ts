import { useEffect } from 'react';
import { useSharedValue, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useMotion } from '../useMotion';
export function useTickingNumber(target: number, delay = 0, duration?: number) {
  const m = useMotion(),
    value = useSharedValue(m.reduced ? target : 0);
  useEffect(() => {
    value.set(
      m.reduced
        ? target
        : withDelay(
            delay,
            withTiming(target, {
              duration: duration ?? m.duration.emphasized,
              easing: Easing.bezier(...m.easing.enter),
            }),
          ),
    );
  }, [target, delay, duration, m.reduced, m.duration.emphasized, m.easing.enter, value]);
  return value;
}

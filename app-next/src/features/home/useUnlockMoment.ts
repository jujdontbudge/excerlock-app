import { useEffect, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useMotion } from '../../motion/useMotion';
import { feedback } from '../../motion/haptics';
import { tokens as t } from '../../design-system/tokens';
export function useUnlockMoment(state: string) {
  const previous = useRef(state),
    scale = useSharedValue(1),
    m = useMotion();
  useEffect(() => {
    const lifted = (value: string) => value === 'unlockedMet' || value === 'unlockedAtGym';
    if (lifted(state) && !lifted(previous.current)) {
      feedback('success');
      if (!m.reduced)
        scale.set(
          withSequence(withTiming(m.scale.pop, { duration: m.duration.fast }), withSpring(1, t.motion.spring.pop)),
        );
    }
    previous.current = state;
  }, [state, m.reduced, m.scale.pop, m.duration.fast, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

import { useEffect, useRef } from 'react';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useMotion } from '../../motion/useMotion';
import { feedback } from '../../motion/haptics';
export function useUnlockMoment(state: string) {
  const previous = useRef(state),
    scale = useSharedValue(1),
    m = useMotion();
  useEffect(() => {
    const lifted = (value: string) => value === 'unlockedMet' || value === 'unlockedAtGym';
    if (lifted(state) && !lifted(previous.current)) {
      feedback('success');
      if (!m.reduced) scale.set(m.sequence(m.timing(m.scale.pop, 'standard'), m.spring(1, 'pop')));
    }
    previous.current = state;
  }, [state, m, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

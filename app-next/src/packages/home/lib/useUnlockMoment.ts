import { useEffect, useRef } from 'react';
import { useIsFocused } from 'expo-router';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useMotion } from '../../ui/useMotion';
import { foregroundSettled, haptic } from '../../ui/haptics';
import type { RuntimeStatusSnapshot } from '../../ports/RuntimeStatusPort';
const settleAfter = 1500;
const lifted = (value: string) => value === 'unlockedMet' || value === 'unlockedAtGym';
export function useUnlockMoment(state: string, shieldLifts: RuntimeStatusSnapshot['shieldLifts']) {
  const previous = useRef(state),
    seenLifts = useRef(shieldLifts?.confirmed ?? 0),
    mountedAt = useRef(0),
    focused = useIsFocused(),
    scale = useSharedValue(1),
    m = useMotion();
  const settled = () => focused && Date.now() - mountedAt.current >= settleAfter && foregroundSettled(settleAfter);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (lifted(state) && !lifted(previous.current)) {
      if (!shieldLifts && settled()) haptic('unlock');
      if (!m.reduced) scale.set(m.sequence(m.timing(m.scale.pop, 'standard'), m.spring(1, 'pop')));
    }
    previous.current = state;
  });
  useEffect(() => {
    if (!shieldLifts || shieldLifts.confirmed <= seenLifts.current) return;
    seenLifts.current = shieldLifts.confirmed;
    if (shieldLifts.source !== 'foreground' && settled()) haptic('unlock');
  });
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

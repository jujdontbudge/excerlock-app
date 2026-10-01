import { useEffect, useState, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { haptic } from '../../ui/haptics';
import { useUnlockMotion } from './useUnlockMotion';
export function useCeremony(value: number, lifted: boolean, message: string) {
  const progress = useSharedValue(0),
    m = useUnlockMotion(),
    { reduced } = m;
  const [showMessage, setMessage] = useState(false),
    [done, setDone] = useState(false);
  const tick = useRef(0);
  useEffect(() => {
    progress.value = m.timing(value, 'press');
  }, [value, progress, m]);
  useEffect(() => {
    const next = Math.floor(value * 4);
    if (next > tick.current && next < 4 && !reduced) haptic('detent');
    tick.current = next;
  }, [value, tick, reduced]);
  useEffect(() => {
    if (!lifted) return;
    const a = setTimeout(() => {
      setMessage(true);
      AccessibilityInfo.announceForAccessibility(message);
    }, 520);
    const b = setTimeout(() => setDone(true), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [lifted, message]);
  return { progress, showMessage: lifted && showMessage, done: lifted && done };
}

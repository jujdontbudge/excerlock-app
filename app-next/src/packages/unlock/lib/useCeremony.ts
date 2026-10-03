import { useEffect, useState, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { cancelAnimation, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from '../../ui/haptics';
import { useUnlockMotion } from './useUnlockMotion';
export const RING_LAP_MS = 1800;
export const STRIDE_STALL_MS = 1000;
export function useCeremony(value: number, verified: boolean, message: string, { paced = false } = {}) {
  const progress = useSharedValue(0),
    m = useUnlockMotion(),
    { reduced } = m,
    steady = paced && !reduced;
  const [showMessage, setMessage] = useState(false),
    [done, setDone] = useState(false),
    [stalledAt, setStalledAt] = useState(-1),
    [full, setFull] = useState(false);
  const tick = useRef(0);
  const started = value > 0 || verified,
    moving = started && (verified || stalledAt !== value),
    lifted = verified && (!steady || full);
  useEffect(() => {
    if (steady) return;
    progress.set(m.timing(value, 'press'));
  }, [steady, value, progress, m]);
  useEffect(() => {
    if (!steady) return;
    const stall = setTimeout(() => setStalledAt(value === 0 ? -1 : value), value === 0 ? 0 : STRIDE_STALL_MS);
    return () => clearTimeout(stall);
  }, [steady, value]);
  useEffect(() => {
    if (!steady) return;
    if (!started) {
      progress.set(
        m.timing(0, 'standard', {
          done: () => {
            'worklet';
            scheduleOnRN(setFull, false);
          },
        }),
      );
      return;
    }
    if (!moving) {
      cancelAnimation(progress);
      return;
    }
    const remaining = 1 - progress.get();
    progress.set(
      m.timing(1, 'emphasized', {
        curve: 'steady',
        stretch: (remaining * RING_LAP_MS) / m.duration.emphasized,
        done: (finished) => {
          'worklet';
          if (finished) scheduleOnRN(setFull, true);
        },
      }),
    );
  }, [steady, started, moving, progress, m]);
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
  return { progress, lifted, showMessage: lifted && showMessage, done: lifted && done };
}

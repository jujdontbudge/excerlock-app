import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../../ports/useRuntime';
export function useDemoProgress() {
  const { steps, stepsAfter, advance, presence, placement } = useLocalSearchParams<{
      steps?: string;
      stepsAfter?: string;
      advance?: string;
      presence?: string;
      placement?: string;
    }>(),
    runtime = useRuntime();
  useEffect(() => {
    const dev = runtime.dev;
    if (!__DEV__ || runtime.kind !== 'fake' || !dev) return;
    if (presence === 'inside' || presence === 'outside') dev.setPresence(presence);
    if (placement === 'propped' || placement === 'handheld') dev.setPlacement(placement);
  }, [presence, placement, runtime]);
  useEffect(() => {
    const dev = runtime.dev;
    if (!__DEV__ || runtime.kind !== 'fake' || !dev) return;
    if (steps === undefined || !Number.isFinite(Number(steps)) || Number(steps) < 0) return;
    const delay = Number(stepsAfter);
    if (!Number.isFinite(delay) || delay <= 0) {
      dev.setSteps(Number(steps));
      return;
    }
    const timer = setTimeout(() => dev.setSteps(Number(steps)), Math.min(delay, 5000));
    return () => clearTimeout(timer);
  }, [steps, stepsAfter, runtime]);
  useEffect(() => {
    const dev = runtime.dev;
    if (!__DEV__ || runtime.kind !== 'fake' || !dev) return;
    if (advance !== undefined && Number.isFinite(Number(advance)) && Number(advance) > 0)
      dev.advance(Number(advance));
  }, [advance, runtime]);
}

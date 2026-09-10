import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
/** Phase-1 capture controls preserve the mounted Home so its state transition is visible. */
export function useDemoProgress() {
  const { steps, advance, presence, placement } = useLocalSearchParams<{
      steps?: string;
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
    if (steps !== undefined && Number.isFinite(Number(steps)) && Number(steps) >= 0)
      dev.setSteps(Number(steps));
  }, [steps, runtime]);
  useEffect(() => {
    const dev = runtime.dev;
    if (!__DEV__ || runtime.kind !== 'fake' || !dev) return;
    if (advance !== undefined && Number.isFinite(Number(advance)) && Number(advance) > 0)
      dev.advance(Number(advance));
  }, [advance, runtime]);
}

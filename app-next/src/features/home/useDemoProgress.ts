import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
/** Phase-1 capture controls preserve the mounted Home so its state transition is visible. */
export function useDemoProgress() {
  const { steps, advance } = useLocalSearchParams<{ steps?: string; advance?: string }>(),
    runtime = useRuntime();
  useEffect(() => {
    if (steps !== undefined && Number.isFinite(Number(steps)) && Number(steps) >= 0)
      runtime.dev.setSteps(Number(steps));
  }, [steps, runtime]);
  useEffect(() => {
    if (advance !== undefined && Number.isFinite(Number(advance)) && Number(advance) > 0)
      runtime.dev.advance(Number(advance));
  }, [advance, runtime]);
}

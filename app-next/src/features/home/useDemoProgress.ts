import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { devMenuEnabled } from '../../runtime/devFlag';
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
    if (!devMenuEnabled) return;
    if (presence === 'inside' || presence === 'outside') runtime.dev.setPresence(presence);
    if (placement === 'propped' || placement === 'handheld') runtime.dev.setPlacement(placement);
  }, [presence, placement, runtime]);
  useEffect(() => {
    if (!devMenuEnabled) return;
    if (steps !== undefined && Number.isFinite(Number(steps)) && Number(steps) >= 0)
      runtime.dev.setSteps(Number(steps));
  }, [steps, runtime]);
  useEffect(() => {
    if (!devMenuEnabled) return;
    if (advance !== undefined && Number.isFinite(Number(advance)) && Number(advance) > 0)
      runtime.dev.advance(Number(advance));
  }, [advance, runtime]);
}

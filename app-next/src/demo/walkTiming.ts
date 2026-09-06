import { WalkingSession } from '../domain/types';
export function walkedSeconds(script: WalkingSession['phase'][], stepMs: number, elapsedMs: number) {
  return (
    script.reduce(
      (sum, phase, i) => sum + (phase === 'walking' ? Math.max(0, Math.min(stepMs, elapsedMs - i * stepMs)) : 0),
      0,
    ) / 1000
  );
}

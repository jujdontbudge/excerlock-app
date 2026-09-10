import { Runtime } from '../../runtime/Runtime';
/**
 * Legacy entry point retained for callers during root composition. DetectionService
 * now owns automatic walking policy at runtime root; mounting Home must not start a
 * second verifier or manufacture a timed session.
 */
export function startWalkingSync(_runtime: Runtime) { return () => undefined; }

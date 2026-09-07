import { useSyncExternalStore } from 'react';
import { useOptionalRuntime } from '../../runtime/AppRuntimeProvider';
import { useMotion } from '../../motion/useMotion';
const noop = () => () => {};
export function useUnlockMotion() {
  const runtime = useOptionalRuntime(),
    motion = useMotion();
  const scenario = useSyncExternalStore(runtime?.dev.subscribe ?? noop, () => runtime?.dev.snapshot().accessibility);
  return { ...motion, reduced: motion.reduced || scenario === 'reduceMotion' };
}

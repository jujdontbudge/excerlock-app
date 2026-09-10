import { useSyncExternalStore } from 'react';
import { useOptionalRuntime } from '../../runtime/AppRuntimeProvider';
import { useMotion } from '../../motion/useMotion';
const noop = () => () => {};
export function useUnlockMotion() {
  const runtime = useOptionalRuntime(),
    motion = useMotion();
  const dev = __DEV__ ? runtime?.dev : undefined;
  const scenario = useSyncExternalStore(dev?.subscribe ?? noop, () => dev?.snapshot().accessibility);
  return { ...motion, reduced: motion.reduced || scenario === 'reduceMotion' };
}

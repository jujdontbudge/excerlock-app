import { FakeRuntime } from '../demo/FakeRuntime';
import { Runtime } from './Runtime';
export type { Runtime } from './Runtime';
export function createRuntime(mode = process.env.EXPO_PUBLIC_RUNTIME): Runtime {
  if (mode === 'real') throw new Error('Real runtime is unavailable in Phase 1');
  return FakeRuntime();
}

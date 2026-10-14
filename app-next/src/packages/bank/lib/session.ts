import type { Runtime } from '../../ports/Runtime';
export let bankRuntime: Runtime | null = null;
export function setBankRuntime(runtime: Runtime | null) {
  bankRuntime = runtime;
}
let drainQueue: Promise<unknown> = Promise.resolve();
export function withBankDrain<T>(operation: () => Promise<T>): Promise<T> {
  const result = drainQueue.then(operation);
  drainQueue = result.catch(() => undefined);
  return result;
}

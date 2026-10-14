import type { Runtime } from '../../ports/Runtime';
export let bankRuntime: Runtime | null = null;
export function setBankRuntime(runtime: Runtime | null) {
  bankRuntime = runtime;
}

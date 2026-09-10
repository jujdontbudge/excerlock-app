import { RuntimeSingleton } from './RuntimeSingleton';
import type { RealRuntime } from './createRealRuntime';
import { registerHeadlessDetectionBootstrap } from './detection/headlessRegistry';

export function reportRuntimeError(error: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
  Sentry.captureException(error);
}
const singleton = new RuntimeSingleton<RealRuntime>(async () => {
  // Lazy construction keeps native work behind the explicit boot/hydration gate.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createRealRuntime } = require('./createRealRuntime') as typeof import('./createRealRuntime');
  return createRealRuntime({ reportError: reportRuntimeError });
});
export const getProductionRuntime = singleton.get;
// The VM, not a tab/provider mount, owns this graph. UI unmount must not kill a
// handler while TaskManager uses it; only explicit process/test teardown disposes.
export const disposeProductionRuntime = singleton.dispose;
registerHeadlessDetectionBootstrap(async () => {
  await getProductionRuntime();
});

import { RuntimeSingleton } from './RuntimeSingleton';
import type { RealRuntime } from './createRealRuntime';
import { registerHeadlessDetectionBootstrap } from './detection/headlessRegistry';

export function reportRuntimeError(error: unknown): void {
  // Keep SDK evaluation behind the runtime error path while exposing only the
  // local capture binding to Metro's static dependency graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { reportSentryError } = require('@sentry-capture') as typeof import('@sentry-capture');
  reportSentryError(error);
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

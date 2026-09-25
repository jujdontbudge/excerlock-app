import { RuntimeSingleton } from './RuntimeSingleton';
import type { RealRuntime } from './createRealRuntime';
import { registerHeadlessDetectionBootstrap } from './detection/headlessRegistry';

export function reportRuntimeError(error: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { reportSentryError } = require('@sentry-capture') as typeof import('@sentry-capture');
  reportSentryError(error);
}
const singleton = new RuntimeSingleton<RealRuntime>(async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { createRealRuntime } = require('./createRealRuntime') as typeof import('./createRealRuntime');
  return createRealRuntime({ reportError: reportRuntimeError });
});
export const getProductionRuntime = singleton.get;
export const disposeProductionRuntime = singleton.dispose;
registerHeadlessDetectionBootstrap(async () => {
  await getProductionRuntime();
});

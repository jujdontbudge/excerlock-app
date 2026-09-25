import { RuntimeSingleton } from '../platform/RuntimeSingleton';
import type { RealRuntime } from './lib/createRealRuntime';
import { registerHeadlessDetectionBootstrap } from '../activity/headlessRegistry';

import { reportRuntimeError } from '../telemetry/reportRuntimeError';
const singleton = new RuntimeSingleton<RealRuntime>(async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { createRealRuntime } = require('./lib/createRealRuntime') as typeof import('./lib/createRealRuntime');
  return createRealRuntime({ reportError: reportRuntimeError });
});
export const getProductionRuntime = singleton.get;
export const disposeProductionRuntime = singleton.dispose;
registerHeadlessDetectionBootstrap(async () => {
  await getProductionRuntime();
});

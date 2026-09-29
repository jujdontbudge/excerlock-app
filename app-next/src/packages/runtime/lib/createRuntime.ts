import type { FakeRuntimeInstance } from '../../dev-harness/FakeRuntime';
import type { Runtime } from '../../ports/Runtime';
import { getProductionRuntime } from '../productionRuntime';
import { createAccountDataCoordinator, createMemoryAccountDataStorage } from '../AccountDataCoordinator';
export type { Runtime } from '../../ports/Runtime';
export function createRuntime(): FakeRuntimeInstance;
export function createRuntime(mode: 'fake'): FakeRuntimeInstance;
export function createRuntime(mode: 'real'): Promise<Runtime>;
export function createRuntime(mode: 'fake' | 'real' = 'fake'): Runtime | Promise<Runtime> {
  if (mode === 'real') return getProductionRuntime();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { FakeRuntime } = require('../../dev-harness/FakeRuntime') as typeof import('../../dev-harness/FakeRuntime');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { Platform } = require('react-native') as typeof import('react-native');
    const runtime = FakeRuntime({
      createAccountData: () => createAccountDataCoordinator(createMemoryAccountDataStorage()),
    });
    if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { foregroundGym } = require('../../gyms/ForegroundGym') as typeof import('../../gyms/ForegroundGym');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { supportDelivery } = require('../../support/SupportDelivery') as typeof import('../../support/SupportDelivery');
      runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
      runtime.support = supportDelivery(runtime.support);
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const Constants = (require('expo-constants') as typeof import('expo-constants')).default;
      if (Constants.isDevice) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
        const { nativeGait } = require('./NativeGait') as typeof import('./NativeGait');
        runtime.gait = nativeGait() ?? runtime.gait;
      }
    }
    return runtime;
  }
  throw new Error('Demo services are unavailable in a release build');
}

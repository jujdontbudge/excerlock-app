import type { FakeRuntimeInstance } from '../demo/FakeRuntime';
import type { Runtime } from './Runtime';
import { getProductionRuntime } from './productionRuntime';
export type { Runtime } from './Runtime';
export function createRuntime(): FakeRuntimeInstance;
export function createRuntime(mode: 'fake'): FakeRuntimeInstance;
export function createRuntime(mode: 'real'): Promise<Runtime>;
export function createRuntime(mode: 'fake' | 'real' = 'fake'): Runtime | Promise<Runtime> {
  if (mode === 'real') return getProductionRuntime();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { FakeRuntime } = require('../demo/FakeRuntime') as typeof import('../demo/FakeRuntime');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { Platform } = require('react-native') as typeof import('react-native');
    const runtime = FakeRuntime();
    if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { foregroundGym } = require('./ForegroundGym') as typeof import('./ForegroundGym');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { supportDelivery } = require('./SupportDelivery') as typeof import('./SupportDelivery');
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

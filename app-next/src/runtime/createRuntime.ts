import { FakeRuntime } from '../demo/FakeRuntime';
import { Runtime } from './Runtime';
import { Platform } from 'react-native';
import { foregroundGym } from './ForegroundGym';
import Constants from 'expo-constants';
import { nativeGait } from './NativeGait';
import { supportDelivery } from './SupportDelivery';
export type { Runtime } from './Runtime';
export function createRuntime(mode = process.env.EXPO_PUBLIC_RUNTIME): Runtime {
  if (mode === 'real') throw new Error('Real runtime is unavailable in Phase 1');
  const runtime = FakeRuntime();
  if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
    runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
    if (Constants.isDevice) runtime.gait = nativeGait() ?? runtime.gait;
    runtime.support = supportDelivery(runtime.support);
  }
  return runtime;
}

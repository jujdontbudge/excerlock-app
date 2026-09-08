import { FakeRuntime } from '../demo/FakeRuntime';
import { Runtime } from './Runtime';
import { Platform } from 'react-native';
import { foregroundGym } from './ForegroundGym';
import Constants from 'expo-constants';
import { nativeGait } from './NativeGait';
import { expoNotifications } from '../adapters/notifications/expoNotifications';
import { createAnalyticsAdapter } from '../adapters/analytics';
export type { Runtime } from './Runtime';
export function createRuntime(mode = process.env.EXPO_PUBLIC_RUNTIME): Runtime {
  if (mode === 'real') throw new Error('Real runtime is unavailable in Phase 1');
  const runtime = FakeRuntime();
  if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
    runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
    if (Constants.isDevice) runtime.gait = nativeGait() ?? runtime.gait;
    // Local notifications work in the simulator too, so the real adapter binds wherever the
    // native module is present; a dev client built without it keeps the fake.
    runtime.notifications = expoNotifications() ?? runtime.notifications;
  }
  if (process.env.NODE_ENV !== 'test') attachAnalytics(runtime);
  return runtime;
}

/**
 * Swaps the recording fake for the real PostHog adapter when the project is configured. Without a
 * key the fake stays, so a keyless build still logs to the dev event stream and nothing branches
 * at a call site.
 */
function attachAnalytics(runtime: Runtime): void {
  const adapter = createAnalyticsAdapter();
  if (!adapter) return;
  runtime.analytics = adapter.analytics;
  const dispose = runtime.dispose;
  runtime.dispose = () => {
    adapter.stop();
    dispose();
  };
}

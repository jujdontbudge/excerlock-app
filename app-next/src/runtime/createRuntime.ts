import { FakeRuntime } from '../demo/FakeRuntime';
import { Runtime } from './Runtime';
import { Platform } from 'react-native';
import { foregroundGym } from './ForegroundGym';
import Constants from 'expo-constants';
import { nativeGait } from './NativeGait';
import { expoNotifications } from '../adapters/notifications/expoNotifications';
import { createAnalyticsAdapter } from '../adapters/analytics';
import { nativeScreenTime } from './NativeScreenTime';
import { createRealRuntime, RealRuntimeScope } from './realRuntime';
import { reportError } from '../observability/reportError';
export type { Runtime } from './Runtime';

/**
 * The composition root's one decision: the demo runtime, or the one that talks to the real world.
 *
 * The demo runtime is the default everywhere — every test, every Expo Go session and every dev build
 * that has not asked otherwise. `EXPO_PUBLIC_RUNTIME=real` is what selects the real one, and Expo
 * inlines it at build time, so a shipped binary is decided when it is built and never at runtime.
 * Inside the real runtime each binding is still capability-checked the way P2-T04 checks for the
 * DeviceActivity module: what cannot be built keeps its fake.
 */
export function createRuntime(mode = process.env.EXPO_PUBLIC_RUNTIME): Runtime {
  if (mode === 'real') return createRealRuntime({ report: reportRuntimeIssue });
  const runtime = FakeRuntime();
  if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
    runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
    if (Constants.isDevice) {
      runtime.gait = nativeGait() ?? runtime.gait;
      // Screen Time only exists on a real device, so the fake stays everywhere else. Disposing the
      // adapter is part of disposing the runtime: it holds a native subscription.
      const screenTime = nativeScreenTime(runtime.clock);
      if (screenTime) {
        runtime.screenTime = screenTime;
        const disposeFakes = runtime.dispose;
        runtime.dispose = () => {
          screenTime.dispose();
          disposeFakes();
        };
      }
    }
    // Local notifications work in the simulator too, so the real adapter binds wherever the
    // native module is present; a dev client built without it keeps the fake.
    runtime.notifications = expoNotifications() ?? runtime.notifications;
  }
  if (process.env.NODE_ENV !== 'test') attachAnalytics(runtime);
  return runtime;
}

/**
 * A binding the real runtime could not construct. It is never user-facing: the app kept the fake and
 * carried on, and this is how we find out on a build where that was not what we wanted.
 */
function reportRuntimeIssue(scope: RealRuntimeScope, detail: unknown): void {
  reportError(detail instanceof Error ? detail : new Error(`runtime.${scope}`), undefined);
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

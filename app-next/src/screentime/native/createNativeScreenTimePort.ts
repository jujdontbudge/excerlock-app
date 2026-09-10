import type { LockDecision, PermissionStatus } from '../../domain/types';
import type { WatchdogRegistration } from '../../domain/watchdog';
import type { LockApplyResult, ScreenTimePort } from '../../ports/ScreenTimePort';
import { deviceActivityApi } from './deviceActivityApi';
import { nativeScreenTimePicker, NativeScreenTimePickerHost } from './NativeScreenTimePickerHost';
import { NATIVE_LOCKED_SELECTION } from './nativeSelection';

export type NativeScreenTimeEnforcementHandler = Readonly<{
  applyLock(decision: LockDecision): Promise<LockApplyResult>;
  registerWatchdog(plan: WatchdogRegistration): Promise<WatchdogRegistration>;
  cancelWatchdog(): Promise<void>;
}>;
export type NativeScreenTimeRequestState = Readonly<{ authorizationPromptBusy: boolean; pickerBusy: boolean }>;
const mapAuthorization = (value: 0 | 1 | 2): PermissionStatus => value === 2 ? 'granted' : value === 1 ? 'denied' : 'notDetermined';

/**
 * Real iOS port. Shield writes are deliberately injected so EnforcementHost
 * remains the sole policy authority; this adapter never invokes the legacy scheduler.
 * NativeScreenTimePickerHost must be mounted once at the runtime React root.
 */
export function createNativeScreenTimePort(enforcement: NativeScreenTimeEnforcementHandler): ScreenTimePort & { requestState(): NativeScreenTimeRequestState } {
  let authorization = mapAuthorization(deviceActivityApi.authorizationStatus());
  let authorizationPromptBusy = false;
  let pickerBusy = false;
  return {
    authorizationStatus: () => authorization,
    requestAuthorization: async () => {
      if (authorizationPromptBusy) return authorization;
      authorizationPromptBusy = true;
      try {
        if (authorization === 'notDetermined') await deviceActivityApi.requestAuthorization('individual').catch(() => undefined);
        authorization = mapAuthorization(deviceActivityApi.authorizationStatus());
        return authorization;
      } finally { authorizationPromptBusy = false; }
    },
    presentAppPicker: async () => {
      if (pickerBusy) throw new Error('A Screen Time picker request is already active');
      if (authorization !== 'granted') throw new Error('Screen Time authorization is required before selection');
      pickerBusy = true;
      try {
        const contents = await nativeScreenTimePicker.pick(NATIVE_LOCKED_SELECTION);
        return {
          handle: contents && (contents.applicationCount > 0 || contents.categoryCount > 0) ? { token: NATIVE_LOCKED_SELECTION } : null,
          appCount: contents?.applicationCount ?? 0,
          categoryCount: contents?.categoryCount ?? 0,
        };
      } finally { pickerBusy = false; }
    },
    applyLock: enforcement.applyLock,
    registerWatchdog: enforcement.registerWatchdog,
    cancelWatchdog: enforcement.cancelWatchdog,
    observeUsage: (callback) => { callback(null); return () => undefined; },
    requestState: () => ({ authorizationPromptBusy, pickerBusy }),
  };
}
export { NativeScreenTimePickerHost };

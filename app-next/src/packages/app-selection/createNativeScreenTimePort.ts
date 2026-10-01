import type { LockDecision, PermissionStatus } from '../model/types';
import type { WatchdogRegistration } from '../ports/watchdog';
import type { LockApplyResult, ScreenTimePort } from '../ports/ScreenTimePort';
import { deviceActivityApi } from './lib/deviceActivityApi';
import { nativeScreenTimePicker, NativeScreenTimePickerHost } from './lib/NativeScreenTimePickerHost';
import { NATIVE_LOCKED_SELECTION } from './nativeSelection';
import { ScreenTimeAuthorizationError } from './ScreenTimeAuthorizationError';

export type NativeScreenTimeEnforcementHandler = Readonly<{
  applyLock(decision: LockDecision): Promise<LockApplyResult>;
  registerWatchdog(plan: WatchdogRegistration): Promise<WatchdogRegistration>;
  cancelWatchdog(): Promise<void>;
}>;
export type NativeScreenTimeRequestState = Readonly<{ authorizationPromptBusy: boolean; pickerBusy: boolean }>;
export type NativeScreenTimePort = ScreenTimePort & {
  requestState(): NativeScreenTimeRequestState;
  eraseLockedSelection(): Promise<void>;
};
const mapAuthorization = (value: 0 | 1 | 2): PermissionStatus => value === 2 ? 'granted' : value === 1 ? 'denied' : 'notDetermined';

export function createNativeScreenTimePort(enforcement: NativeScreenTimeEnforcementHandler, denial: Readonly<{ isDenied(): boolean; remember(): void }>): NativeScreenTimePort {
  let authorization = mapAuthorization(deviceActivityApi.authorizationStatus());
  let authorizationPromptBusy = false;
  let pickerBusy = false;
  const readAuthorization = () => {
    const status = mapAuthorization(deviceActivityApi.authorizationStatus());
    authorization = status === 'notDetermined' && denial.isDenied() ? 'denied' : status;
    return authorization;
  };
  const requestAuthorization = async () => {
    if (authorizationPromptBusy) return authorization;
    authorizationPromptBusy = true;
    try {
      if (readAuthorization() === 'notDetermined') await deviceActivityApi.requestAuthorization('individual');
      return readAuthorization();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Family Controls authorization canceled.')) {
        denial.remember();
        return readAuthorization();
      }
      if (readAuthorization() === 'denied') return authorization;
      throw error;
    } finally { authorizationPromptBusy = false; }
  };
  return {
    selectionSummary: () => deviceActivityApi.selectionMetadata(NATIVE_LOCKED_SELECTION) ?? null,
    authorizationStatus: readAuthorization,
    requestAuthorization,
    presentAppPicker: async () => {
      if (pickerBusy) throw new Error('A Screen Time picker request is already active');
      if (readAuthorization() === 'notDetermined') await requestAuthorization();
      if (authorization !== 'granted') throw new ScreenTimeAuthorizationError(authorization);
      pickerBusy = true;
      try {
        const contents = await nativeScreenTimePicker.pick(NATIVE_LOCKED_SELECTION);
        const summary = contents ?? deviceActivityApi.selectionMetadata(NATIVE_LOCKED_SELECTION);
        const selected = Boolean(summary && (summary.applicationCount > 0 || summary.categoryCount > 0 || (summary.webDomainCount ?? 0) > 0));
        return { handle: selected ? { token: NATIVE_LOCKED_SELECTION } : null, isEmpty: !selected };
      } finally { pickerBusy = false; }
    },
    applyLock: enforcement.applyLock,
    registerWatchdog: enforcement.registerWatchdog,
    cancelWatchdog: enforcement.cancelWatchdog,
    observeUsage: (callback) => { callback(null); return () => undefined; },
    eraseLockedSelection: async () => {
      deviceActivityApi.removeFamilyActivitySelectionId(NATIVE_LOCKED_SELECTION);
    },
    requestState: () => ({ authorizationPromptBusy, pickerBusy }),
  };
}
export { NativeScreenTimePickerHost };

import type { LockDecision, PermissionStatus } from '../../domain/types';
import type { WatchdogRegistration } from '../../domain/watchdog';
import type { LockApplyResult, ScreenTimePort } from '../../ports/ScreenTimePort';
import { deviceActivityApi } from './deviceActivityApi';
import { nativeScreenTimePicker, NativeScreenTimePickerHost } from './NativeScreenTimePickerHost';
import { NATIVE_LOCKED_SELECTION } from './nativeSelection';
import { rulesStore } from '../../state/rulesStore';
import { ScreenTimeAuthorizationError } from '../ScreenTimeAuthorizationError';

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

export function createNativeScreenTimePort(enforcement: NativeScreenTimeEnforcementHandler): NativeScreenTimePort {
  let authorization = mapAuthorization(deviceActivityApi.authorizationStatus());
  let authorizationPromptBusy = false;
  let pickerBusy = false;
  const readAuthorization = () => { authorization = mapAuthorization(deviceActivityApi.authorizationStatus()); return authorization; };
  const requestAuthorization = async () => {
    if (authorizationPromptBusy) return authorization;
    authorizationPromptBusy = true;
    try {
      if (readAuthorization() === 'notDetermined') await deviceActivityApi.requestAuthorization('individual');
      return readAuthorization();
    } finally { authorizationPromptBusy = false; }
  };
  return {
    authorizationStatus: readAuthorization,
    requestAuthorization,
    presentAppPicker: async () => {
      if (pickerBusy) throw new Error('A Screen Time picker request is already active');
      if (readAuthorization() === 'notDetermined') await requestAuthorization();
      if (authorization !== 'granted') throw new ScreenTimeAuthorizationError(authorization);
      pickerBusy = true;
      try {
        const contents = await nativeScreenTimePicker.pick(NATIVE_LOCKED_SELECTION);
        const selectedFromPicker = Boolean(
          contents && (contents.applicationCount > 0 || contents.categoryCount > 0),
        );
        const persisted = deviceActivityApi.getFamilyActivitySelectionId(NATIVE_LOCKED_SELECTION);
        const selected = selectedFromPicker || Boolean(persisted);
        if (!selected) return rulesStore.getState().data.lockedApps;
        return {
          handle: { token: NATIVE_LOCKED_SELECTION },
          isEmpty: false,
        };
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

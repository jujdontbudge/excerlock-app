import { nativeGait } from './NativeGait';
import { requireNativeModule } from 'expo-modules-core';
import type { Runtime } from '../../ports/Runtime';
import { nativePermissionRequests } from '../../activity/NativePermissionRequests';
import { createNativeScreenTimePort, NativeScreenTimePickerHost } from '../../app-selection/createNativeScreenTimePort';
import { createNativeNotifications } from '../../notifications/createNativeNotifications';
import { permissionsStore } from '../../permissions/permissionsStore';
import { rulesStore } from '../../conditions/rulesStore';

export function attachNativePermissionHarness(runtime: Runtime) {
  void requireNativeModule<{ setPreferencesAsync(settings: { showFloatingActionButton: boolean }): Promise<void> }>('DevMenuPreferences').setPreferencesAsync({ showFloatingActionButton: false });
  runtime.appPickerHost = NativeScreenTimePickerHost;
  const requests = nativePermissionRequests();
  const screenTime = createNativeScreenTimePort({
    applyLock: async () => ({ applied: false }),
    registerWatchdog: async (plan) => plan,
    cancelWatchdog: async () => undefined,
  });
  runtime.screenTime = {
    ...screenTime,
    requestAuthorization: async () => {
      const status = await screenTime.requestAuthorization();
      permissionsStore.getState().patch({ screenTime: status });
      return status;
    },
    presentAppPicker: async () => {
      const selected = await screenTime.presentAppPicker();
      rulesStore.getState().patch({ lockedApps: selected });
      return selected;
    },
  };
  runtime.steps = { ...runtime.steps, authorizationStatus: requests.motionStatus, request: async () => {
    const motion = await requests.requestMotion();
    permissionsStore.getState().patch({ motion });
    return motion;
  } };
  runtime.gym = { ...runtime.gym, requestLocation: async () => {
    const location = await requests.requestLocation();
    permissionsStore.getState().patch({ location });
    return location;
  }, requestBackgroundLocation: async () => {
    const location = await requests.requestBackgroundLocation();
    permissionsStore.getState().patch({ location });
    return location;
  } };
  runtime.notifications = createNativeNotifications(() => true);
  runtime.gait = nativeGait() ?? runtime.gait;
}

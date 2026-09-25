import * as DeviceActivity from "react-native-device-activity";

import type { DeviceActivityApi } from "./deviceActivityTypes";

export const deviceActivityApi: DeviceActivityApi = {
  authorizationStatus: DeviceActivity.getAuthorizationStatus,
  requestAuthorization: DeviceActivity.requestAuthorization,
  getFamilyActivitySelectionId: DeviceActivity.getFamilyActivitySelectionId,
  removeFamilyActivitySelectionId: DeviceActivity.removeFamilyActivitySelectionId,
  setSharedValue: DeviceActivity.userDefaultsSet,
  blockSelection: DeviceActivity.blockSelection,
  unblockSelection: DeviceActivity.unblockSelection,
  configureActions: DeviceActivity.configureActions,
  startMonitoring: (activityName, schedule, events) =>
    DeviceActivity.startMonitoring(activityName, schedule, [...events]),
  stopMonitoring: DeviceActivity.stopMonitoring,
  isShieldActive: DeviceActivity.isShieldActive,
  onDeviceActivityMonitorEvent: DeviceActivity.onDeviceActivityMonitorEvent,
};

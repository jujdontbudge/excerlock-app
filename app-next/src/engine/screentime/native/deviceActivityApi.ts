import * as DeviceActivity from "react-native-device-activity";

import type { DeviceActivityApi } from "./deviceActivityTypes";

/** The one file allowed to translate ExcerLock operations into package calls. */
export const deviceActivityApi: DeviceActivityApi = {
  authorizationStatus: DeviceActivity.getAuthorizationStatus,
  requestAuthorization: DeviceActivity.requestAuthorization,
  getFamilyActivitySelectionId: DeviceActivity.getFamilyActivitySelectionId,
  setSharedValue: DeviceActivity.userDefaultsSet,
  getSharedValue: DeviceActivity.userDefaultsGet,
  selectionMetadata: DeviceActivity.activitySelectionMetadata,
  blockSelection: DeviceActivity.blockSelection,
  unblockSelection: DeviceActivity.unblockSelection,
  configureActions: DeviceActivity.configureActions,
  startMonitoring: (activityName, schedule, events) =>
    DeviceActivity.startMonitoring(activityName, schedule, [...events]),
  stopMonitoring: DeviceActivity.stopMonitoring,
  getActivities: DeviceActivity.getActivities,
  getEvents: DeviceActivity.getEvents,
  cleanUpAfterActivity: DeviceActivity.cleanUpAfterActivity,
  isShieldActive: DeviceActivity.isShieldActive,
  onDeviceActivityMonitorEvent: DeviceActivity.onDeviceActivityMonitorEvent,
};

import * as DeviceActivity from "react-native-device-activity";

import type { DeviceActivityApi } from "./deviceActivityTypes";

/**
 * The one file that translates ExcerLock operations into package calls, including the app-group
 * writes the shield transport makes. The single exception is the selection sheet, which is a view
 * component rather than an operation and cannot pass through a function-shaped interface.
 */
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

import type { DeviceActivityDateComponents } from "./deviceActivitySchedule";

export type DeviceActivityAuthorizationStatus = 0 | 1 | 2;

export type DeviceActivityEvent = Readonly<{
  familyActivitySelection: string;
  threshold: Readonly<{ minute: number; second: number }>;
  eventName: string;
  includesPastActivity: boolean;
}>;

/** One callback the monitor extension recorded in the app group. */
export type DeviceActivityEventRecord = Readonly<{
  activityName: string;
  callbackName: string;
  eventName?: string;
  lastCalledAt: Date;
}>;

export type DeviceActivityApi = Readonly<{
  authorizationStatus(): DeviceActivityAuthorizationStatus;
  requestAuthorization(forMember: "individual" | "child"): Promise<void>;
  getFamilyActivitySelectionId(id: string): string | undefined;
  setSharedValue(key: string, value: Readonly<Record<string, unknown>>): void;
  blockSelection(selection: { activitySelectionId: string }): void;
  unblockSelection(selection: { activitySelectionId: string }): void;
  configureActions(input: {
    activityName: string;
    callbackName:
      | "intervalDidStart"
      | "intervalDidEnd"
      | "eventDidReachThreshold";
    eventName?: string;
    actions: Array<{
      type: "blockSelection" | "unblockSelection";
      familyActivitySelectionId: string;
    }>;
  }): void;
  startMonitoring(
    activityName: string,
    schedule: {
      intervalStart: DeviceActivityDateComponents;
      intervalEnd: DeviceActivityDateComponents;
      repeats: boolean;
    },
    events: readonly DeviceActivityEvent[],
  ): Promise<void>;
  stopMonitoring(activityNames?: string[]): void;
  /** The app-group log of extension callbacks, one record per (activity, callback, event). */
  getEvents(onlyEventsForActivityWithName?: string): readonly DeviceActivityEventRecord[];
  isShieldActive(): boolean;
  onDeviceActivityMonitorEvent(
    listener: (event: { callbackName: string }) => void,
  ): { remove(): void };
}>;

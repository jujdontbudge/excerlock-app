import type { DeviceActivityDateComponents } from "./deviceActivitySchedule";

export type DeviceActivityAuthorizationStatus = 0 | 1 | 2;

/** One callback the monitor extension recorded in the app group. */
export type DeviceActivityEventRecord = Readonly<{
  activityName: string;
  callbackName: string;
  eventName?: string;
  lastCalledAt: Date;
}>;

export type DeviceActivityEvent = Readonly<{
  familyActivitySelection: string;
  threshold: Readonly<{ minute: number; second: number }>;
  eventName: string;
  includesPastActivity: boolean;
}>;

export type DeviceActivityApi = Readonly<{
  authorizationStatus(): DeviceActivityAuthorizationStatus;
  requestAuthorization(forMember: "individual" | "child"): Promise<void>;
  getFamilyActivitySelectionId(id: string): string | undefined;
  setSharedValue(key: string, value: unknown): void;
  getSharedValue<T>(key: string): T | undefined;
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
  /** The activity names the OS is monitoring right now. */
  getActivities(): readonly string[];
  /** Drops an activity's recorded events, so a sealed day stops being counted twice. */
  cleanUpAfterActivity(activityName: string): void;
  getEvents(onlyEventsForActivityWithName?: string): readonly DeviceActivityEventRecord[];
  isShieldActive(): boolean;
  onDeviceActivityMonitorEvent(
    listener: (event: { callbackName: string }) => void,
  ): { remove(): void };
}>;

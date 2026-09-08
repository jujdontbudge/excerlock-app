import type { DeviceActivityDateComponents } from "./deviceActivitySchedule";

export type DeviceActivityAuthorizationStatus = 0 | 1 | 2;

/** Every callback the package can report, wider than the three we schedule. */
export type DeviceActivityCallbackName =
  | "intervalDidStart"
  | "intervalDidEnd"
  | "eventDidReachThreshold"
  | "intervalWillStartWarning"
  | "intervalWillEndWarning"
  | "eventWillReachThresholdWarning";

/** One callback the system has already delivered, as `getEvents` reports it. */
export type DeviceActivityFiredEvent = Readonly<{
  activityName: string;
  callbackName: DeviceActivityCallbackName;
  eventName?: string;
  lastCalledAt: Date;
}>;

/** Counts behind an opaque selection id, so a selection can be described
 *  without ever naming an app. */
export type DeviceActivitySelectionMetadata = Readonly<{
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
  includeEntireCategory: boolean;
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
  setSharedValue(key: string, value: Readonly<Record<string, unknown>>): void;
  getSharedValue<T>(key: string): T | undefined;
  selectionMetadata(selection: {
    activitySelectionId: string;
  }): DeviceActivitySelectionMetadata | undefined;
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
  /** Names of the monitors iOS currently holds, which is the only truth about
   *  what survived a reboot or a crash. */
  getActivities(): readonly string[];
  getEvents(
    onlyForActivityNamed?: string,
  ): readonly DeviceActivityFiredEvent[];
  cleanUpAfterActivity(activityName: string): void;
  isShieldActive(): boolean;
  onDeviceActivityMonitorEvent(
    listener: (event: { callbackName: string }) => void,
  ): { remove(): void };
}>;

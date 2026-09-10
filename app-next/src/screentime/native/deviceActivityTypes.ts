import type { DeviceActivityDateComponents } from "./deviceActivitySchedule";

export type DeviceActivityAuthorizationStatus = 0 | 1 | 2;

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
  removeFamilyActivitySelectionId(id: string): void;
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
  isShieldActive(): boolean;
  onDeviceActivityMonitorEvent(
    listener: (event: { callbackName: string }) => void,
  ): { remove(): void };
}>;

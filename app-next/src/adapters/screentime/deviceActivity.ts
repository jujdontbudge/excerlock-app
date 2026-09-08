/**
 * The slice of the native Screen Time engine this adapter needs, declared here so the adapter
 * can be built and tested before the engine moves.
 *
 * merge: P2-T03 provides `src/engine/screentime/native/deviceActivityTypes.ts` and
 * `deviceActivityApi.ts`. When they land, delete the types below and import `DeviceActivityApi`
 * from `../../engine/screentime/native/deviceActivityTypes`, after adding these members to it —
 * each is already exported by react-native-device-activity 0.6.1, the version `app/package.json`
 * pins, so the change there is one line per member (re-verify if P2-T03 upgrades the package):
 *   getSharedValue       -> DeviceActivity.userDefaultsGet
 *   getActivities        -> DeviceActivity.getActivities
 *   getEvents            -> DeviceActivity.getEvents
 *   cleanUpAfterActivity -> DeviceActivity.cleanUpAfterActivity
 *   selectionMetadata    -> DeviceActivity.activitySelectionMetadata
 * and widening its `DeviceActivityDateComponents` with the optional `timeZoneIdentifier` the
 * package accepts. Nothing in this file imports the package: the adapter never talks to a vendor.
 */

export type DeviceActivityAuthorizationStatus = 0 | 1 | 2;

/**
 * A Foundation `DateComponents`. `timeZoneIdentifier` is what keeps a schedule anchored to the
 * rule's zone instead of whatever zone the device happens to be in when the app registers it.
 */
export type DeviceActivityDateComponents = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timeZoneIdentifier?: string;
}>;

export type DeviceActivitySchedule = Readonly<{
  intervalStart: DeviceActivityDateComponents;
  intervalEnd: DeviceActivityDateComponents;
  repeats: boolean;
}>;

export type DeviceActivityEvent = Readonly<{
  familyActivitySelection: string;
  threshold: Readonly<{ minute: number; second: number }>;
  eventName: string;
  includesPastActivity: boolean;
}>;

export type DeviceActivityCallbackName = 'intervalDidStart' | 'intervalDidEnd' | 'eventDidReachThreshold';

export type DeviceActivityAction = Readonly<{
  type: 'blockSelection' | 'unblockSelection';
  familyActivitySelectionId: string;
}>;

/** One firing recorded by the monitor extension; `getEvents` is how the app learns about it. */
export type DeviceActivityEventRecord = Readonly<{
  activityName: string;
  callbackName: string;
  eventName?: string;
  lastCalledAt: Date;
}>;

export type SelectionMetadata = Readonly<{ applicationCount: number; categoryCount: number }>;

export type DeviceActivityApi = Readonly<{
  authorizationStatus(): DeviceActivityAuthorizationStatus;
  requestAuthorization(forMember: 'individual' | 'child'): Promise<void>;
  /** `undefined` for an id this device never persisted — a selection the user has since lost. */
  getFamilyActivitySelectionId(id: string): string | undefined;
  selectionMetadata(selection: { activitySelectionId: string }): SelectionMetadata | undefined;
  setSharedValue(key: string, value: unknown): void;
  getSharedValue<T>(key: string): T | undefined;
  blockSelection(selection: { activitySelectionId: string }): void;
  unblockSelection(selection: { activitySelectionId: string }): void;
  configureActions(input: {
    activityName: string;
    callbackName: DeviceActivityCallbackName;
    eventName?: string;
    actions: DeviceActivityAction[];
  }): void;
  startMonitoring(
    activityName: string,
    schedule: DeviceActivitySchedule,
    events: readonly DeviceActivityEvent[],
  ): Promise<void>;
  stopMonitoring(activityNames?: string[]): void;
  /** The activity names the OS is monitoring right now. */
  getActivities(): readonly string[];
  /** Drops an activity's recorded events so a finished day stops being counted. */
  cleanUpAfterActivity(activityName: string): void;
  getEvents(onlyEventsForActivityWithName?: string): readonly DeviceActivityEventRecord[];
  isShieldActive(): boolean;
  onDeviceActivityMonitorEvent(listener: (event: { callbackName: string }) => void): { remove(): void };
}>;

/**
 * The FamilyControls picker. It is a native view, so the host that renders it lives above this
 * adapter and hands the resulting counts back.
 *
 * merge: P2-T03 provides `src/engine/screentime/native/NativeSelectionPicker.ts` and
 * `NativeScreenTimePickerHost.tsx`; point the runtime composition at the ported host.
 */
export interface SelectionPicker {
  /** `null` when the user cancelled or chose nothing. */
  pick(selectionId: string): Promise<SelectionMetadata | null>;
}

export const MISSING_SELECTION_PICKER: SelectionPicker = {
  async pick(): Promise<null> {
    throw new Error('The native Screen Time picker host is not configured');
  },
};

/** The only selection id this app issues; the FamilyControls tokens never leave the app group. */
export const LOCKED_SELECTION_ID = 'excerlock.selection.locked.v1';

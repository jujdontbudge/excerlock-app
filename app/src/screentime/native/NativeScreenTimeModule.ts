import type { DesiredOsState } from "@excerlock/ledger";

import type {
  CurrentShieldState,
  LockWindow,
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
  ScreenTimeSelectionSummary,
  ScreenTimeUnsubscribe,
  ShieldStateListener,
} from "../ScreenTimeModule";

type DeviceActivityAuthorizationStatus = 0 | 1 | 2;

export type DeviceActivityApi = Readonly<{
  authorizationStatus(): DeviceActivityAuthorizationStatus;
  requestAuthorization(forMember: "individual" | "child"): Promise<void>;
  blockSelection(selection: { activitySelectionId: string }): void;
  unblockSelection(selection: { activitySelectionId: string }): void;
  configureActions(input: {
    activityName: string;
    callbackName: "intervalDidStart" | "intervalDidEnd";
    actions: Array<{
      type: "blockSelection" | "unblockSelection";
      familyActivitySelectionId: string;
    }>;
  }): void;
  startMonitoring(
    activityName: string,
    schedule: {
      intervalStart: Record<string, number | string>;
      intervalEnd: Record<string, number | string>;
      repeats: boolean;
    },
    events: readonly never[],
  ): Promise<void>;
  stopMonitoring(activityNames?: string[]): void;
  isShieldActive(): boolean;
}>;

type NativeScreenTimeModuleOptions = Readonly<{
  deviceActivity: DeviceActivityApi;
}>;

const AUTHORIZATION_STATUSES: Record<
  DeviceActivityAuthorizationStatus,
  ScreenTimeAuthorizationStatus
> = {
  0: "notDetermined",
  1: "denied",
  2: "approved",
};

const INITIAL_SHIELD_STATE: CurrentShieldState = Object.freeze({
  selection: null,
  desiredOsState: Object.freeze({ shields: "down", drainThresholds: [] }),
  effectiveShields: "down",
  activeLockWindowId: null,
});

export class NativeScreenTimeModule implements ScreenTimeModule {
  private readonly deviceActivity: DeviceActivityApi;

  public constructor({ deviceActivity }: NativeScreenTimeModuleOptions) {
    this.deviceActivity = deviceActivity;
  }

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    return AUTHORIZATION_STATUSES[this.deviceActivity.authorizationStatus()];
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    const current = await this.getAuthorizationStatus();
    if (current === "notDetermined") {
      await this.deviceActivity.requestAuthorization("individual");
    }
    return this.getAuthorizationStatus();
  }

  public async pickSelection(): Promise<ScreenTimeSelectionHandle | null> {
    throw new Error("The native Screen Time picker host is not configured yet");
  }

  public async describeSelection(
    _selection: ScreenTimeSelectionHandle,
  ): Promise<ScreenTimeSelectionSummary | null> {
    return null;
  }

  public async reconcile(
    _selection: ScreenTimeSelectionHandle,
    _desiredOsState: DesiredOsState,
  ): Promise<void> {
    throw new Error("Native shield reconciliation is not configured yet");
  }

  public async scheduleLockWindow(
    _selection: ScreenTimeSelectionHandle,
    _window: LockWindow,
  ): Promise<void> {
    throw new Error("Native lock-window scheduling is not configured yet");
  }

  public async cancelLockWindow(_id: string): Promise<void> {
    throw new Error("Native lock-window scheduling is not configured yet");
  }

  public async getLockWindows(): Promise<readonly LockWindow[]> {
    return [];
  }

  public async getCurrentShieldState(): Promise<CurrentShieldState> {
    return INITIAL_SHIELD_STATE;
  }

  public subscribe(_listener: ShieldStateListener): ScreenTimeUnsubscribe {
    return () => undefined;
  }
}

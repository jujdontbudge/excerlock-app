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
import {
  desiredOsStatesEqual,
  freezeDesiredOsState,
  shieldStatesEqual,
} from "../shieldState";
import {
  summarizeSelection,
  type SelectionContents,
} from "../selectionSummary";
import {
  localDateComponents,
  UNLOCK_INCREMENT_MS,
  UNLOCK_LEASE_MONITOR,
} from "./deviceActivitySchedule";

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

export interface NativeSelectionPicker {
  pick(
    selection: ScreenTimeSelectionHandle,
  ): Promise<SelectionContents | null>;
}

type NativeScreenTimeModuleOptions = Readonly<{
  deviceActivity: DeviceActivityApi;
  picker?: NativeSelectionPicker;
  nowMs?: () => number;
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

const LOCKED_SELECTION =
  "excerlock.selection.locked.v1" as ScreenTimeSelectionHandle;

const MISSING_PICKER: NativeSelectionPicker = {
  async pick(): Promise<never> {
    throw new Error("The native Screen Time picker host is not configured");
  },
};

export class NativeScreenTimeModule implements ScreenTimeModule {
  private readonly deviceActivity: DeviceActivityApi;
  private readonly picker: NativeSelectionPicker;
  private readonly nowMs: () => number;
  private readonly selections = new Map<string, SelectionContents>();
  private readonly listeners = new Set<ShieldStateListener>();
  private currentShieldState = INITIAL_SHIELD_STATE;

  public constructor({
    deviceActivity,
    picker = MISSING_PICKER,
    nowMs = Date.now,
  }: NativeScreenTimeModuleOptions) {
    this.deviceActivity = deviceActivity;
    this.picker = picker;
    this.nowMs = nowMs;
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
    if ((await this.getAuthorizationStatus()) !== "approved") {
      throw new Error("Screen Time authorization is required before selection");
    }

    const contents = await this.picker.pick(LOCKED_SELECTION);
    if (
      contents === null ||
      (contents.applicationCount === 0 && contents.categoryCount === 0)
    ) {
      return null;
    }
    this.selections.set(LOCKED_SELECTION, contents);
    return LOCKED_SELECTION;
  }

  public async describeSelection(
    selection: ScreenTimeSelectionHandle,
  ): Promise<ScreenTimeSelectionSummary | null> {
    const contents = this.selections.get(selection);
    return contents === undefined
      ? null
      : summarizeSelection(selection, contents);
  }

  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    this.assertIssuedSelection(selection);
    const desired = freezeDesiredOsState(desiredOsState);
    if (desired.shields === "up") {
      this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
    } else {
      await this.armUnlockLease(selection);
      this.deviceActivity.unblockSelection({ activitySelectionId: selection });
    }

    this.updateShieldState({
      selection,
      desiredOsState: desired,
      effectiveShields: desired.shields,
      activeLockWindowId: null,
    });
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
    return this.currentShieldState;
  }

  public subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async armUnlockLease(
    selection: ScreenTimeSelectionHandle,
  ): Promise<void> {
    const startsAtMs = this.nowMs();
    const endsAtMs = startsAtMs + UNLOCK_INCREMENT_MS;
    this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
    this.deviceActivity.configureActions({
      activityName: UNLOCK_LEASE_MONITOR,
      callbackName: "intervalDidEnd",
      actions: [
        {
          type: "blockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    try {
      await this.deviceActivity.startMonitoring(
        UNLOCK_LEASE_MONITOR,
        {
          intervalStart: localDateComponents(startsAtMs),
          intervalEnd: localDateComponents(endsAtMs),
          repeats: false,
        },
        [],
      );
    } catch (error) {
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
      throw error;
    }
  }

  private assertIssuedSelection(selection: ScreenTimeSelectionHandle): void {
    if (!this.selections.has(selection)) {
      throw new Error("Screen Time selection handle is stale or unknown");
    }
  }

  private updateShieldState(next: CurrentShieldState): void {
    if (
      shieldStatesEqual(this.currentShieldState, next) &&
      desiredOsStatesEqual(
        this.currentShieldState.desiredOsState,
        next.desiredOsState,
      )
    ) {
      return;
    }
    this.currentShieldState = Object.freeze(next);
    this.listeners.forEach((listener) => listener(this.currentShieldState));
  }
}

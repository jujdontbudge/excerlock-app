import type { DesiredOsState } from "@excerlock/ledger";
import type { StateStorage } from "zustand/middleware";

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
  deriveShieldState,
  desiredOsStatesEqual,
  freezeDesiredOsState,
  shieldStatesEqual,
} from "../shieldState";
import {
  summarizeSelection,
  type SelectionContents,
} from "../selectionSummary";
import {
  type DeviceActivityDateComponents,
  localDateComponents,
  monitorNameForLockWindow,
  UNLOCK_INCREMENT_MS,
  UNLOCK_LEASE_MONITOR,
} from "./deviceActivitySchedule";
import {
  createNativeScreenTimePersistence,
  type NativeScheduledLockWindow,
} from "./nativeStore";

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
      intervalStart: DeviceActivityDateComponents;
      intervalEnd: DeviceActivityDateComponents;
      repeats: boolean;
    },
    events: readonly never[],
  ): Promise<void>;
  stopMonitoring(activityNames?: string[]): void;
  isShieldActive(): boolean;
  onDeviceActivityMonitorEvent(
    listener: (event: { callbackName: string }) => void,
  ): { remove(): void };
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
  storage?: StateStorage<Promise<void>>;
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
  private readonly persistence: ReturnType<
    typeof createNativeScreenTimePersistence
  >;
  private readonly ready: Promise<void>;
  private readonly monitorSubscription: { remove(): void };
  private readonly selections = new Map<string, SelectionContents>();
  private readonly listeners = new Set<ShieldStateListener>();
  private lockWindows: NativeScheduledLockWindow[] = [];
  private currentShieldState = INITIAL_SHIELD_STATE;

  public constructor({
    deviceActivity,
    picker = MISSING_PICKER,
    nowMs = Date.now,
    storage,
  }: NativeScreenTimeModuleOptions) {
    this.deviceActivity = deviceActivity;
    this.picker = picker;
    this.nowMs = nowMs;
    this.persistence = createNativeScreenTimePersistence(storage);
    this.ready = this.persistence.rehydrate().then(() => {
      const state = this.persistence.getState();
      Object.entries(state.selectionContents).forEach(([handle, contents]) => {
        this.selections.set(handle, contents);
      });
      this.lockWindows = [...state.lockWindows];
      this.currentShieldState = deriveShieldState(
        state.selection,
        state.desiredOsState,
        state.lockWindows,
        this.nowMs(),
      );
    });
    this.monitorSubscription =
      this.deviceActivity.onDeviceActivityMonitorEvent(() => {
        this.refreshObservedShieldState();
      });
  }

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    await this.ready;
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
    await this.ready;
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
    await this.persistState(LOCKED_SELECTION, this.currentShieldState.desiredOsState);
    return LOCKED_SELECTION;
  }

  public async describeSelection(
    selection: ScreenTimeSelectionHandle,
  ): Promise<ScreenTimeSelectionSummary | null> {
    await this.ready;
    const contents = this.selections.get(selection);
    return contents === undefined
      ? null
      : summarizeSelection(selection, contents);
  }

  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    await this.ready;
    this.assertIssuedSelection(selection);
    const desired = freezeDesiredOsState(desiredOsState);
    this.lockWindows.forEach((window) => {
      this.configureLockWindowStart(window, desired.shields);
    });
    await this.applyEffectiveState(selection, desired);
    await this.persistState(selection, desired);
  }

  public async scheduleLockWindow(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
  ): Promise<void> {
    await this.ready;
    this.assertIssuedSelection(selection);
    this.assertValidLockWindow(window);
    const existing = this.lockWindows.find(({ id }) => id === window.id);
    if (
      existing?.selection === selection &&
      existing.startsAtMs === window.startsAtMs &&
      existing.endsAtMs === window.endsAtMs
    ) {
      return;
    }

    const scheduled: NativeScheduledLockWindow = Object.freeze({
      ...window,
      selection,
    });
    this.configureLockWindowStart(
      scheduled,
      this.currentShieldState.desiredOsState.shields,
    );
    this.deviceActivity.configureActions({
      activityName: monitorNameForLockWindow(window.id),
      callbackName: "intervalDidEnd",
      actions: [
        {
          type: "unblockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    await this.deviceActivity.startMonitoring(
      monitorNameForLockWindow(window.id),
      {
        intervalStart: localDateComponents(window.startsAtMs),
        intervalEnd: localDateComponents(window.endsAtMs),
        repeats: false,
      },
      [],
    );
    this.lockWindows = [
      ...this.lockWindows.filter(({ id }) => id !== window.id),
      scheduled,
    ].sort((left, right) => left.startsAtMs - right.startsAtMs);
    await this.applyEffectiveState(
      selection,
      this.currentShieldState.desiredOsState,
    );
    await this.persistState(
      selection,
      this.currentShieldState.desiredOsState,
    );
  }

  public async cancelLockWindow(id: string): Promise<void> {
    await this.ready;
    const existing = this.lockWindows.find((window) => window.id === id);
    if (existing === undefined) {
      return;
    }
    this.deviceActivity.stopMonitoring([monitorNameForLockWindow(id)]);
    this.lockWindows = this.lockWindows.filter((window) => window.id !== id);
    await this.applyEffectiveState(
      existing.selection,
      this.currentShieldState.desiredOsState,
    );
    await this.persistState(
      existing.selection,
      this.currentShieldState.desiredOsState,
    );
  }

  public async getLockWindows(): Promise<readonly LockWindow[]> {
    await this.ready;
    return this.lockWindows.map(({ id, startsAtMs, endsAtMs }) =>
      Object.freeze({ id, startsAtMs, endsAtMs }),
    );
  }

  public async getCurrentShieldState(): Promise<CurrentShieldState> {
    await this.ready;
    this.refreshObservedShieldState();
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

  private configureLockWindowStart(
    window: NativeScheduledLockWindow,
    desiredShields: DesiredOsState["shields"],
  ): void {
    this.deviceActivity.configureActions({
      activityName: monitorNameForLockWindow(window.id),
      callbackName: "intervalDidStart",
      actions: [
        {
          type:
            desiredShields === "up" ? "blockSelection" : "unblockSelection",
          familyActivitySelectionId: window.selection,
        },
      ],
    });
  }

  private async applyEffectiveState(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    const activeWindow = this.lockWindows.find(
      ({ startsAtMs, endsAtMs }) =>
        this.nowMs() >= startsAtMs && this.nowMs() < endsAtMs,
    );
    const effectiveShields =
      this.lockWindows.length > 0 && activeWindow === undefined
        ? "down"
        : desiredOsState.shields;
    const needsUnlockLease =
      effectiveShields === "down" && desiredOsState.shields === "down";

    if (effectiveShields === "up") {
      this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
    } else {
      if (needsUnlockLease) {
        await this.armUnlockLease(selection);
      } else {
        this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
      }
      this.deviceActivity.unblockSelection({ activitySelectionId: selection });
    }

    this.updateShieldState({
      selection,
      desiredOsState,
      effectiveShields,
      activeLockWindowId: activeWindow?.id ?? null,
    });
  }

  private assertIssuedSelection(selection: ScreenTimeSelectionHandle): void {
    if (!this.selections.has(selection)) {
      throw new Error("Screen Time selection handle is stale or unknown");
    }
  }

  private assertValidLockWindow(window: LockWindow): void {
    if (
      window.id.trim().length === 0 ||
      !Number.isFinite(window.startsAtMs) ||
      !Number.isFinite(window.endsAtMs) ||
      window.startsAtMs >= window.endsAtMs
    ) {
      throw new Error("Lock window must have an id and a non-empty finite interval");
    }
  }

  private persistState(
    selection: ScreenTimeSelectionHandle | null,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    return this.persistence.update({
      selection,
      desiredOsState,
      lockWindows: this.lockWindows,
      selectionContents: Object.fromEntries(this.selections),
    });
  }

  private refreshObservedShieldState(): void {
    const nowMs = this.nowMs();
    const activeWindow = this.lockWindows.find(
      ({ startsAtMs, endsAtMs }) =>
        nowMs >= startsAtMs && nowMs < endsAtMs,
    );
    this.updateShieldState({
      ...this.currentShieldState,
      effectiveShields: this.deviceActivity.isShieldActive() ? "up" : "down",
      activeLockWindowId: activeWindow?.id ?? null,
    });
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

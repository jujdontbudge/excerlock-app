import type { MonitorPlan } from "../../../domain/monitorPlan";
import type { StateStorage } from "zustand/middleware";

import type {
  CurrentShieldState,
  ScheduledMonitor,
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
  ScreenTimeSelectionSummary,
  ScreenTimeUnsubscribe,
  ShieldIntent,
  ShieldStateListener,
} from "../ScreenTimeModule";
import { deriveShieldState, shieldStatesEqual } from "../shieldState";
import {
  summarizeSelection,
  type SelectionContents,
} from "../selectionSummary";
import type {
  DeviceActivityApi,
  DeviceActivityAuthorizationStatus,
} from "./deviceActivityTypes";
import {
  MISSING_NATIVE_SELECTION_PICKER,
  type NativeSelectionPicker,
} from "./NativeSelectionPicker";
import { NativeShieldScheduler } from "./NativeShieldScheduler";
import { NATIVE_LOCKED_SELECTION } from "./nativeSelection";
import { createNativeScreenTimePersistence } from "./nativeStore";

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
  desiredShields: "down",
  effectiveShields: "down",
  activeMonitorName: null,
});

/** Native Screen Time facade; package calls and schedule policy live below it. */
export class NativeScreenTimeModule implements ScreenTimeModule {
  private readonly deviceActivity: DeviceActivityApi;
  private readonly picker: NativeSelectionPicker;
  private readonly persistence: ReturnType<
    typeof createNativeScreenTimePersistence
  >;
  private readonly scheduler: NativeShieldScheduler;
  private readonly ready: Promise<void>;
  private readonly monitorSubscription: { remove(): void };
  private readonly selections = new Map<string, SelectionContents>();
  private readonly listeners = new Set<ShieldStateListener>();
  private currentShieldState = INITIAL_SHIELD_STATE;

  public constructor({
    deviceActivity,
    picker = MISSING_NATIVE_SELECTION_PICKER,
    nowMs = Date.now,
    storage,
  }: NativeScreenTimeModuleOptions) {
    this.deviceActivity = deviceActivity;
    this.picker = picker;
    this.persistence = createNativeScreenTimePersistence(storage);
    this.scheduler = new NativeShieldScheduler(deviceActivity, nowMs);
    this.ready = this.persistence.rehydrate().then(() => {
      const state = this.persistence.getState();
      Object.entries(state.selectionContents).forEach(([handle, contents]) => {
        this.selections.set(handle, contents);
      });
      this.scheduler.restore(state.monitors);
      this.currentShieldState = deriveShieldState(
        state.selection,
        state.desiredShields,
        this.scheduler.publicMonitors(),
        nowMs(),
      );
    });
    this.monitorSubscription = deviceActivity.onDeviceActivityMonitorEvent(
      () => {
        this.refreshObservedShieldState();
      },
    );
  }

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    await this.ready;
    return AUTHORIZATION_STATUSES[this.deviceActivity.authorizationStatus()];
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    const current = await this.getAuthorizationStatus();
    if (current === "notDetermined") {
      // FamilyControls throws on "Don't Allow" and on a dead sheet alike, but
      // it records the refusal before throwing, so the re-read status below is
      // the truthful outcome either way. Rethrowing would just detach the UI
      // from what the OS already decided.
      await this.deviceActivity.requestAuthorization("individual").catch(() => undefined);
    }
    return this.getAuthorizationStatus();
  }

  public async pickSelection(): Promise<ScreenTimeSelectionHandle | null> {
    await this.ready;
    if ((await this.getAuthorizationStatus()) !== "approved") {
      throw new Error("Screen Time authorization is required before selection");
    }
    const contents = await this.picker.pick(NATIVE_LOCKED_SELECTION);
    if (
      contents === null ||
      (contents.applicationCount === 0 && contents.categoryCount === 0)
    ) {
      return null;
    }
    this.selections.set(NATIVE_LOCKED_SELECTION, contents);
    await this.persistState(
      NATIVE_LOCKED_SELECTION,
      this.currentShieldState.desiredShields,
    );
    return NATIVE_LOCKED_SELECTION;
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
    shields: ShieldIntent,
    plan: MonitorPlan,
  ): Promise<void> {
    await this.ready;
    this.assertIssuedSelection(selection);
    const shield = await this.scheduler.reconcile(selection, shields, plan);
    this.updateShieldState({ selection, desiredShields: shields, ...shield });
    await this.persistState(selection, shields);
  }

  public async armUnlockLease(
    selection: ScreenTimeSelectionHandle,
    untilMs: number,
  ): Promise<void> {
    await this.ready;
    this.assertIssuedSelection(selection);
    await this.scheduler.armUnlockLease(selection, untilMs);
  }

  public async stopUnlockLease(): Promise<void> {
    await this.ready;
    this.scheduler.stopUnlockLease();
  }

  public async getMonitors(): Promise<readonly ScheduledMonitor[]> {
    await this.ready;
    return this.scheduler.publicMonitors();
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

  private assertIssuedSelection(selection: ScreenTimeSelectionHandle): void {
    if (!this.selections.has(selection)) {
      throw new Error("Screen Time selection handle is stale or unknown");
    }
  }

  private persistState(
    selection: ScreenTimeSelectionHandle | null,
    desiredShields: ShieldIntent,
  ): Promise<void> {
    return this.persistence.update({
      selection,
      desiredShields,
      monitors: this.scheduler.persistedMonitors(),
      selectionContents: Object.fromEntries(this.selections),
    });
  }

  private refreshObservedShieldState(): void {
    this.updateShieldState({
      ...this.currentShieldState,
      ...this.scheduler.observe(),
    });
  }

  private updateShieldState(next: CurrentShieldState): void {
    if (shieldStatesEqual(this.currentShieldState, next)) {
      return;
    }
    this.currentShieldState = Object.freeze(next);
    this.listeners.forEach((listener) => listener(this.currentShieldState));
  }
}

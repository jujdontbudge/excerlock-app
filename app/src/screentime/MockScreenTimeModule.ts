import type { DesiredOsState } from "@excerlock/ledger";
import type { StateStorage } from "zustand/middleware";

import type {
  CurrentShieldState,
  FiredDrainRung,
  LockWindow,
  ScreenTimeUnsubscribe,
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
  ScreenTimeSelectionSummary,
  ShieldStateListener,
} from "./ScreenTimeModule";
import {
  DEFAULT_SELECTION_CONTENTS,
  summarizeSelection,
  type SelectionContents,
} from "./selectionSummary";
import {
  SystemScreenTimeClock,
  type CancelScheduledClockTask,
  type ScreenTimeClock,
} from "./clock";
import { createMockScreenTimePersistence } from "./mockStore";
import {
  DEFAULT_SHIELD_STATE,
  deriveShieldState,
  desiredOsStatesEqual,
  freezeDesiredOsState,
  shieldStatesEqual,
} from "./shieldState";

type AuthorizationDecision = Exclude<
  ScreenTimeAuthorizationStatus,
  "notDetermined"
>;

type MockScreenTimeModuleOptions = Readonly<{
  clock?: ScreenTimeClock;
  storage?: StateStorage<Promise<void>>;
}>;

export class MockScreenTimeModule implements ScreenTimeModule {
  private readonly clock: ScreenTimeClock;
  private readonly persistence: ReturnType<typeof createMockScreenTimePersistence>;
  private readonly ready: Promise<void>;
  private nextAuthorizationResult: AuthorizationDecision = "approved";
  private nextSelectionContents: SelectionContents = DEFAULT_SELECTION_CONTENTS;
  private scheduledClockTasks: CancelScheduledClockTask[] = [];
  private readonly shieldStateListeners = new Set<ShieldStateListener>();
  private currentShieldState: CurrentShieldState = DEFAULT_SHIELD_STATE;

  public constructor(options: MockScreenTimeModuleOptions = {}) {
    this.clock = options.clock ?? new SystemScreenTimeClock();
    this.persistence = createMockScreenTimePersistence(options.storage);
    this.ready = this.persistence.rehydrate().then(() => {
      this.armLockWindowBoundaries();
      this.refreshCurrentShieldState();
    });
  }

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    await this.ready;
    return this.persistence.getState().authorizationStatus;
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    await this.ready;
    if (this.persistence.getState().authorizationStatus === "notDetermined") {
      await this.persistence.update({
        authorizationStatus: this.nextAuthorizationResult,
      });
    }

    return this.persistence.getState().authorizationStatus;
  }

  public async pickSelection(): Promise<ScreenTimeSelectionHandle | null> {
    await this.ready;
    const state = this.persistence.getState();
    if (state.authorizationStatus !== "approved") {
      throw new Error("Screen Time authorization is required before selection");
    }

    const handle = `mock-screen-time-selection:${state.nextSelectionNumber}`;
    await this.persistence.update({
      nextSelectionNumber: state.nextSelectionNumber + 1,
      selectionContents: {
        ...state.selectionContents,
        [handle]: this.nextSelectionContents,
      },
    });
    return handle as ScreenTimeSelectionHandle;
  }

  public async describeSelection(
    selection: ScreenTimeSelectionHandle,
  ): Promise<ScreenTimeSelectionSummary | null> {
    await this.ready;
    const contents = this.persistence.getState().selectionContents[selection];
    return contents === undefined
      ? null
      : summarizeSelection(selection, contents);
  }

  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    await this.ready;
    const desired = freezeDesiredOsState(desiredOsState);
    const state = this.persistence.getState();
    if (
      state.selection === selection &&
      desiredOsStatesEqual(state.desiredOsState, desired)
    ) {
      return;
    }
    await this.persistence.update({ selection, desiredOsState: desired });
    this.refreshCurrentShieldState();
  }

  public async scheduleLockWindow(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
  ): Promise<void> {
    await this.ready;
    this.assertValidLockWindow(window);
    const scheduled = Object.freeze({
      ...window,
      selection,
    });
    const lockWindows = this.persistence.getState().lockWindows;
    const existing = lockWindows.find((candidate) => candidate.id === window.id);
    if (
      existing?.selection === selection &&
      existing.startsAtMs === window.startsAtMs &&
      existing.endsAtMs === window.endsAtMs
    ) {
      return;
    }

    const nextLockWindows = [
      ...lockWindows.filter((candidate) => candidate.id !== window.id),
      scheduled,
    ].sort((left, right) => left.startsAtMs - right.startsAtMs);
    await this.persistence.update({ lockWindows: nextLockWindows });
    this.armLockWindowBoundaries();
    this.refreshCurrentShieldState();
  }

  public async cancelLockWindow(id: string): Promise<void> {
    await this.ready;
    const lockWindows = this.persistence.getState().lockWindows;
    const remaining = lockWindows.filter((window) => window.id !== id);
    if (remaining.length === lockWindows.length) {
      return;
    }
    await this.persistence.update({ lockWindows: remaining });
    this.armLockWindowBoundaries();
    this.refreshCurrentShieldState();
  }

  public async getLockWindows(): Promise<readonly LockWindow[]> {
    await this.ready;
    return this.persistence
      .getState()
      .lockWindows.map(({ id, startsAtMs, endsAtMs }) =>
        Object.freeze({ id, startsAtMs, endsAtMs }),
      );
  }

  public async getCurrentShieldState(): Promise<CurrentShieldState> {
    await this.ready;
    return this.currentShieldState;
  }

  /** The mock has no OS monitor, so no drain rungs ever fire. */
  public async getFiredDrainRungs(): Promise<readonly FiredDrainRung[]> {
    return [];
  }

  public subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe {
    this.shieldStateListeners.add(listener);
    return () => this.shieldStateListeners.delete(listener);
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextAuthorizationResult(result: AuthorizationDecision): void {
    this.nextAuthorizationResult = result;
  }

  /** Deterministic mock driver: what the next `pickSelection()` returns. */
  public setNextSelectionContents(contents: SelectionContents): void {
    this.nextSelectionContents = contents;
  }

  private refreshCurrentShieldState(): void {
    const state = this.persistence.getState();
    const next = deriveShieldState(
      state.selection,
      state.desiredOsState,
      state.lockWindows,
      this.clock.nowMs(),
    );
    if (shieldStatesEqual(this.currentShieldState, next)) {
      return;
    }
    this.currentShieldState = next;
    this.shieldStateListeners.forEach((listener) => listener(next));
  }

  private armLockWindowBoundaries(): void {
    this.scheduledClockTasks.forEach((cancel) => cancel());
    this.scheduledClockTasks = [];
    const nowMs = this.clock.nowMs();
    this.persistence.getState().lockWindows.forEach((window) => {
      [window.startsAtMs, window.endsAtMs]
        .filter((atMs) => atMs > nowMs)
        .forEach((atMs) => {
          this.scheduledClockTasks.push(
            this.clock.scheduleAt(atMs, () => this.refreshCurrentShieldState()),
          );
        });
    });
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
}

import type { DesiredOsState } from "@excerlock/ledger";

import type {
  CurrentShieldState,
  LockWindow,
  ScreenTimeUnsubscribe,
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
  ShieldStateListener,
} from "./ScreenTimeModule";
import {
  SystemScreenTimeClock,
  type CancelScheduledClockTask,
  type ScreenTimeClock,
} from "./clock";

type AuthorizationDecision = Exclude<
  ScreenTimeAuthorizationStatus,
  "notDetermined"
>;

const SHIELDS_DOWN: DesiredOsState = Object.freeze({
  shields: "down",
  drainThresholds: [],
});

function copyDesiredOsState(state: DesiredOsState): DesiredOsState {
  return Object.freeze({
    shields: state.shields,
    drainThresholds: [...state.drainThresholds],
  });
}

type ScheduledLockWindow = LockWindow & {
  readonly selection: ScreenTimeSelectionHandle;
};

type MockScreenTimeModuleOptions = Readonly<{
  clock?: ScreenTimeClock;
}>;

export class MockScreenTimeModule implements ScreenTimeModule {
  private readonly clock: ScreenTimeClock;
  private authorizationStatus: ScreenTimeAuthorizationStatus =
    "notDetermined";
  private nextAuthorizationResult: AuthorizationDecision = "approved";
  private nextSelectionNumber = 1;
  private lockWindows: ScheduledLockWindow[] = [];
  private scheduledClockTasks: CancelScheduledClockTask[] = [];
  private readonly shieldStateListeners = new Set<ShieldStateListener>();
  private currentShieldState: CurrentShieldState = Object.freeze({
    selection: null,
    desiredOsState: SHIELDS_DOWN,
    effectiveShields: "down",
    activeLockWindowId: null,
  });

  public constructor(options: MockScreenTimeModuleOptions = {}) {
    this.clock = options.clock ?? new SystemScreenTimeClock();
  }

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    return this.authorizationStatus;
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    if (this.authorizationStatus === "notDetermined") {
      this.authorizationStatus = this.nextAuthorizationResult;
    }

    return this.authorizationStatus;
  }

  public async pickSelection(): Promise<ScreenTimeSelectionHandle | null> {
    if (this.authorizationStatus !== "approved") {
      throw new Error("Screen Time authorization is required before selection");
    }

    const handle = `mock-screen-time-selection:${this.nextSelectionNumber}`;
    this.nextSelectionNumber += 1;
    return handle as ScreenTimeSelectionHandle;
  }

  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    const desired = copyDesiredOsState(desiredOsState);
    this.setCurrentShieldState(selection, desired);
  }

  public async scheduleLockWindow(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
  ): Promise<void> {
    this.assertValidLockWindow(window);
    const scheduled: ScheduledLockWindow = Object.freeze({
      ...window,
      selection,
    });
    const existing = this.lockWindows.find((candidate) => candidate.id === window.id);
    if (
      existing?.selection === selection &&
      existing.startsAtMs === window.startsAtMs &&
      existing.endsAtMs === window.endsAtMs
    ) {
      return;
    }

    this.lockWindows = [
      ...this.lockWindows.filter((candidate) => candidate.id !== window.id),
      scheduled,
    ].sort((left, right) => left.startsAtMs - right.startsAtMs);
    this.armLockWindowBoundaries();
    this.refreshCurrentShieldState();
  }

  public async cancelLockWindow(id: string): Promise<void> {
    const remaining = this.lockWindows.filter((window) => window.id !== id);
    if (remaining.length === this.lockWindows.length) {
      return;
    }
    this.lockWindows = remaining;
    this.armLockWindowBoundaries();
    this.refreshCurrentShieldState();
  }

  public async getCurrentShieldState(): Promise<CurrentShieldState> {
    return this.currentShieldState;
  }

  public subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe {
    this.shieldStateListeners.add(listener);
    return () => this.shieldStateListeners.delete(listener);
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextAuthorizationResult(result: AuthorizationDecision): void {
    this.nextAuthorizationResult = result;
  }

  private setCurrentShieldState(
    selection: ScreenTimeSelectionHandle | null,
    desiredOsState: DesiredOsState,
  ): void {
    const selectionWindows = this.lockWindows.filter(
      (window) => window.selection === selection,
    );
    const nowMs = this.clock.nowMs();
    const activeWindow = selectionWindows.find(
      (window) => nowMs >= window.startsAtMs && nowMs < window.endsAtMs,
    );
    const effectiveShields =
      selectionWindows.length === 0 || activeWindow
        ? desiredOsState.shields
        : "down";

    const next: CurrentShieldState = Object.freeze({
      selection,
      desiredOsState,
      effectiveShields,
      activeLockWindowId: activeWindow?.id ?? null,
    });
    if (this.shieldStatesEqual(this.currentShieldState, next)) {
      return;
    }
    this.currentShieldState = next;
    this.shieldStateListeners.forEach((listener) => listener(next));
  }

  private refreshCurrentShieldState(): void {
    this.setCurrentShieldState(
      this.currentShieldState.selection,
      this.currentShieldState.desiredOsState,
    );
  }

  private armLockWindowBoundaries(): void {
    this.scheduledClockTasks.forEach((cancel) => cancel());
    this.scheduledClockTasks = [];
    const nowMs = this.clock.nowMs();
    this.lockWindows.forEach((window) => {
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

  private shieldStatesEqual(
    left: CurrentShieldState,
    right: CurrentShieldState,
  ): boolean {
    return (
      left.selection === right.selection &&
      left.effectiveShields === right.effectiveShields &&
      left.activeLockWindowId === right.activeLockWindowId &&
      left.desiredOsState.shields === right.desiredOsState.shields &&
      left.desiredOsState.drainThresholds.length ===
        right.desiredOsState.drainThresholds.length &&
      left.desiredOsState.drainThresholds.every(
        (threshold, index) =>
          threshold === right.desiredOsState.drainThresholds[index],
      )
    );
  }
}

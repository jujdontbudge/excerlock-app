import type { DesiredOsState } from "@excerlock/ledger";

import type {
  CurrentShieldState,
  FiredDrainRung,
  LockWindow,
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
  ScreenTimeSelectionSummary,
  ScreenTimeUnsubscribe,
  ShieldStateListener,
} from "@/screentime";

/**
 * A ScreenTime adapter for lock's own tests, written against the published
 * interface. It exists so these tests never reach for the persistent mock —
 * the boundary README forbids that, and a Phase-3 native swap must not be able
 * to break a test in this module.
 */
export class FakeScreenTime implements ScreenTimeModule {
  private authorization: ScreenTimeAuthorizationStatus = "notDetermined";
  private readonly listeners = new Set<ShieldStateListener>();
  private lockWindows: LockWindow[] = [];
  private issued = 0;
  private shield: CurrentShieldState = {
    selection: null,
    desiredOsState: { shields: "down", drainThresholds: [] },
    effectiveShields: "down",
    activeLockWindowId: null,
  };

  /** What the next `requestAuthorization()` decides. */
  public nextDecision: Exclude<ScreenTimeAuthorizationStatus, "notDetermined"> =
    "approved";
  /** `null` makes the next `pickSelection()` read as a cancelled picker. */
  public nextSelection: ScreenTimeSelectionSummary | null | "cancel" = null;
  /** Every reconcile this adapter received, oldest first. */
  public readonly reconciled: Array<{
    selection: ScreenTimeSelectionHandle;
    desiredOsState: DesiredOsState;
  }> = [];

  private readonly summaries = new Map<string, ScreenTimeSelectionSummary>();

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    return this.authorization;
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    if (this.authorization === "notDetermined") {
      this.authorization = this.nextDecision;
    }
    return this.authorization;
  }

  public async pickSelection(): Promise<ScreenTimeSelectionHandle | null> {
    if (this.authorization !== "approved") {
      throw new Error("Screen Time authorization is required before selection");
    }
    if (this.nextSelection === "cancel") {
      return null;
    }

    this.issued += 1;
    const handle = `fake-selection:${this.issued}` as ScreenTimeSelectionHandle;
    const summary = this.nextSelection ?? {
      handle,
      displayName: "4 apps · 2 categories",
      applicationCount: 4,
      categoryCount: 2,
    };
    this.summaries.set(handle, { ...summary, handle });
    return handle;
  }

  public async describeSelection(
    selection: ScreenTimeSelectionHandle,
  ): Promise<ScreenTimeSelectionSummary | null> {
    return this.summaries.get(selection) ?? null;
  }

  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void> {
    this.reconciled.push({ selection, desiredOsState });
    this.emit({
      ...this.shield,
      selection,
      desiredOsState,
      effectiveShields:
        this.lockWindows.length === 0 ||
        this.shield.activeLockWindowId !== null
          ? desiredOsState.shields
          : "down",
    });
  }

  public async scheduleLockWindow(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
  ): Promise<void> {
    this.lockWindows = [
      ...this.lockWindows.filter(({ id }) => id !== window.id),
      window,
    ].sort((left, right) => left.startsAtMs - right.startsAtMs);
    if (this.shield.selection === selection) {
      this.emit({
        ...this.shield,
        effectiveShields:
          this.shield.activeLockWindowId === null
            ? "down"
            : this.shield.desiredOsState.shields,
      });
    }
  }

  public async cancelLockWindow(id: string): Promise<void> {
    this.lockWindows = this.lockWindows.filter((window) => window.id !== id);
    if (this.shield.activeLockWindowId === id) {
      this.emit({
        ...this.shield,
        activeLockWindowId: null,
        effectiveShields:
          this.lockWindows.length === 0
            ? this.shield.desiredOsState.shields
            : "down",
      });
    } else if (this.lockWindows.length === 0) {
      this.emit({
        ...this.shield,
        effectiveShields: this.shield.desiredOsState.shields,
      });
    }
  }

  public async getLockWindows(): Promise<readonly LockWindow[]> {
    return this.lockWindows;
  }

  public async getCurrentShieldState(): Promise<CurrentShieldState> {
    return this.shield;
  }

  /** Driver: rungs the fake OS reports as fired. */
  public firedDrainRungs: FiredDrainRung[] = [];

  public async getFiredDrainRungs(): Promise<readonly FiredDrainRung[]> {
    return this.firedDrainRungs;
  }

  public subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Driver: what the OS would report when a lock window opens or closes. */
  public enterLockWindow(window: LockWindow): void {
    this.lockWindows = [...this.lockWindows, window];
    this.emit({
      ...this.shield,
      effectiveShields: this.shield.desiredOsState.shields,
      activeLockWindowId: window.id,
    });
  }

  /** Driver: the concrete boundary ended and the schedule is now outside. */
  public exitLockWindow(): void {
    this.emit({
      ...this.shield,
      effectiveShields:
        this.lockWindows.length === 0
          ? this.shield.desiredOsState.shields
          : "down",
      activeLockWindowId: null,
    });
  }

  private emit(shield: CurrentShieldState): void {
    this.shield = Object.freeze(shield);
    this.listeners.forEach((listener) => listener(this.shield));
  }
}

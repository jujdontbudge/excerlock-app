import type { DesiredOsState } from "@excerlock/ledger";

import type {
  CurrentShieldState,
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
} from "./ScreenTimeModule";

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

export class MockScreenTimeModule implements ScreenTimeModule {
  private authorizationStatus: ScreenTimeAuthorizationStatus =
    "notDetermined";
  private nextAuthorizationResult: AuthorizationDecision = "approved";
  private nextSelectionNumber = 1;
  private currentShieldState: CurrentShieldState = Object.freeze({
    selection: null,
    desiredOsState: SHIELDS_DOWN,
    effectiveShields: "down",
    activeLockWindowId: null,
  });

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
    if (
      this.currentShieldState.selection === selection &&
      this.currentShieldState.desiredOsState.shields === desired.shields &&
      this.currentShieldState.desiredOsState.drainThresholds.length ===
        desired.drainThresholds.length &&
      this.currentShieldState.desiredOsState.drainThresholds.every(
        (threshold, index) => threshold === desired.drainThresholds[index],
      )
    ) {
      return;
    }

    this.currentShieldState = Object.freeze({
      selection,
      desiredOsState: desired,
      effectiveShields: desired.shields,
      activeLockWindowId: null,
    });
  }

  public async getCurrentShieldState(): Promise<CurrentShieldState> {
    return this.currentShieldState;
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextAuthorizationResult(result: AuthorizationDecision): void {
    this.nextAuthorizationResult = result;
  }
}

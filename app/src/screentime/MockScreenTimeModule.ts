import type {
  ScreenTimeAuthorizationStatus,
  ScreenTimeModule,
} from "./ScreenTimeModule";

type AuthorizationDecision = Exclude<
  ScreenTimeAuthorizationStatus,
  "notDetermined"
>;

export class MockScreenTimeModule implements ScreenTimeModule {
  private authorizationStatus: ScreenTimeAuthorizationStatus =
    "notDetermined";
  private nextAuthorizationResult: AuthorizationDecision = "approved";

  public async getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
    return this.authorizationStatus;
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    if (this.authorizationStatus === "notDetermined") {
      this.authorizationStatus = this.nextAuthorizationResult;
    }

    return this.authorizationStatus;
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextAuthorizationResult(result: AuthorizationDecision): void {
    this.nextAuthorizationResult = result;
  }
}

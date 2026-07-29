export type ScreenTimeAuthorizationStatus =
  | "notDetermined"
  | "approved"
  | "denied";

export interface ScreenTimeModule {
  getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus>;
  requestAuthorization(): Promise<ScreenTimeAuthorizationStatus>;
}


export type ScreenTimeAuthorizationStatus =
  | "notDetermined"
  | "denied"
  | "approved";

export type ScreenTimeEvent =
  | {
      readonly type: "tick";
      readonly atMs: number;
      readonly thresholdIndex: number;
    }
  | {
      readonly type: "monitorFired";
      readonly atMs: number;
      readonly monitor: string;
    }
  | {
      readonly type: "intervalEnded";
      readonly atMs: number;
      readonly monitor: string;
    };

export type ScreenTimeUnsubscribe = () => void;

export interface ScreenTimeProvider {
  requestAuthorization(): Promise<ScreenTimeAuthorizationStatus>;
  getAuthorizationStatus(): ScreenTimeAuthorizationStatus;
  getEvents(sinceAtMs?: number): Promise<readonly ScreenTimeEvent[]>;
  onEvent(callback: (event: ScreenTimeEvent) => void): ScreenTimeUnsubscribe;
  onAuthorizationChange(
    callback: (status: ScreenTimeAuthorizationStatus) => void,
  ): ScreenTimeUnsubscribe;
}

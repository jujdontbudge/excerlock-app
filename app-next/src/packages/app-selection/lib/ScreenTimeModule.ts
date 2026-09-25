export type DesiredOsState = { shields: "up" | "down"; drainThresholds: number[] };

export type ScreenTimeAuthorizationStatus =
  | "notDetermined"
  | "approved"
  | "denied";

declare const selectionHandleBrand: unique symbol;

export type ScreenTimeSelectionHandle = string & {
  readonly [selectionHandleBrand]: "ScreenTimeSelectionHandle";
};

export type ScreenTimeSelectionSummary = Readonly<{
  handle: ScreenTimeSelectionHandle;
  displayName: string;
  applicationCount: number;
  categoryCount: number;
}>;

export type CurrentShieldState = Readonly<{
  selection: ScreenTimeSelectionHandle | null;
  desiredOsState: DesiredOsState;
  effectiveShields: DesiredOsState["shields"];
  activeLockWindowId: string | null;
}>;

export type LockWindow = Readonly<{
  id: string;
  startsAtMs: number;
  endsAtMs: number;
}>;

export type ShieldStateListener = (state: CurrentShieldState) => void;
export type ScreenTimeUnsubscribe = () => void;

export interface ScreenTimeModule {
  getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus>;
  requestAuthorization(): Promise<ScreenTimeAuthorizationStatus>;
  pickSelection(): Promise<ScreenTimeSelectionHandle | null>;
  describeSelection(
    selection: ScreenTimeSelectionHandle,
  ): Promise<ScreenTimeSelectionSummary | null>;
  reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void>;
  scheduleLockWindow(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
  ): Promise<void>;
  cancelLockWindow(id: string): Promise<void>;
  getLockWindows(): Promise<readonly LockWindow[]>;
  getCurrentShieldState(): Promise<CurrentShieldState>;
  subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe;
}

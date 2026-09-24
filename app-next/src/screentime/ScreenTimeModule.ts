export type DesiredOsState = { shields: "up" | "down"; drainThresholds: number[] };

export type ScreenTimeAuthorizationStatus =
  | "notDetermined"
  | "approved"
  | "denied";

declare const selectionHandleBrand: unique symbol;

/**
 * An adapter-owned reference to a FamilyControls selection. Its contents are
 * intentionally unavailable to callers; it is never a bundle identifier.
 */
export type ScreenTimeSelectionHandle = string & {
  readonly [selectionHandleBrand]: "ScreenTimeSelectionHandle";
};

/**
 * Everything the OS is willing to say about a selection: how much is in it, and
 * one adapter-composed line to show the user. FamilyControls renders app names
 * only inside its own `Label` view, so no display string here — and none in
 * Phase 3 either — is ever derived from a bundle identifier.
 */
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
  /** `null` for a handle this adapter never issued (a stale persisted token). */
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
  /** Registered windows in start order — how a caller learns when a shield lifts. */
  getLockWindows(): Promise<readonly LockWindow[]>;
  getCurrentShieldState(): Promise<CurrentShieldState>;
  subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe;
}

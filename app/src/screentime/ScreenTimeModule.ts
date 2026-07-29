import type { DesiredOsState } from "@excerlock/ledger";

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

export interface ScreenTimeModule {
  getAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus>;
  requestAuthorization(): Promise<ScreenTimeAuthorizationStatus>;
  pickSelection(): Promise<ScreenTimeSelectionHandle | null>;
  reconcile(
    selection: ScreenTimeSelectionHandle,
    desiredOsState: DesiredOsState,
  ): Promise<void>;
  scheduleLockWindow(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
  ): Promise<void>;
  cancelLockWindow(id: string): Promise<void>;
  getCurrentShieldState(): Promise<CurrentShieldState>;
}

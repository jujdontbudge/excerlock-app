import type { MonitorPlan } from "../../domain/monitorPlan";

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

/**
 * What the shield should be doing right now.
 *
 * This replaces the ledger's `DesiredOsState`. The drain ladder is gone with
 * the balance economy, and the lock windows are no longer per-rule: they arrive
 * as the absolute, merged, budgeted `MonitorPlan` that `compileMonitorPlan`
 * produces (P2-T14 §2). Everything the OS must know that is not "shield or do
 * not shield" is expressed by reconfiguring those monitors' action lists, which
 * is the only met-today mechanism DeviceActivity offers.
 */
export type ShieldIntent = "up" | "down";

/** A DeviceActivity monitor this adapter has registered, in start order. */
export type ScheduledMonitor = Readonly<{
  name: string;
  startsAtMs: number;
  endsAtMs: number;
}>;

export type CurrentShieldState = Readonly<{
  selection: ScreenTimeSelectionHandle | null;
  desiredShields: ShieldIntent;
  effectiveShields: ShieldIntent;
  /** The monitor whose interval contains now, or null outside every window. */
  activeMonitorName: string | null;
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
  /**
   * The one re-arm routine. It registers exactly the monitors the plan names,
   * retires the ones it does not, and applies `shields` — so a rule edit, a
   * midnight rollover, a timezone change, an entitlement transition and a lease
   * renewal all come through here.
   */
  reconcile(
    selection: ScreenTimeSelectionHandle,
    shields: ShieldIntent,
    plan: MonitorPlan,
  ): Promise<void>;
  /**
   * Arms the renewable walking lease to end at `untilMs`. There is no renew: a
   * verified event produces a later deadline and calls this again, and a lapsed
   * lease is never revived — the OS re-shields on its own when it ends.
   */
  armUnlockLease(
    selection: ScreenTimeSelectionHandle,
    untilMs: number,
  ): Promise<void>;
  stopUnlockLease(): Promise<void>;
  /** Registered monitors in start order — how a caller learns when a shield lifts. */
  getMonitors(): Promise<readonly ScheduledMonitor[]>;
  getCurrentShieldState(): Promise<CurrentShieldState>;
  subscribe(listener: ShieldStateListener): ScreenTimeUnsubscribe;
}

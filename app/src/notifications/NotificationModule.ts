import type { NotificationRoute, NotificationTypeId } from "./model/catalog";
import type { NotificationContent } from "./model/copy";

/**
 * The app-facing seam for iOS local notifications.
 *
 * Phase 2 is a persistent mock. Phase 3 swaps in `expo-notifications` behind
 * `getNotificationModule()` and no caller changes — see `accessor.ts`.
 *
 * **Local scheduling only.** There is no push token, no remote payload, and no
 * server call anywhere behind this interface. PRD §7 cuts remote push and any
 * server-side computation of earning or locking; the server never decides that a
 * notification should exist, because it never knows the balance in the first
 * place. Everything here is a locally-scheduled trigger over locally-computed
 * ledger facts.
 */

export type NotificationAuthorizationStatus =
  | "notDetermined"
  | "approved"
  | "denied";

/**
 * One notification, resolved: when it fires, what it says, where tapping it
 * lands. `id` is deterministic (`type:dayIndex`) so re-planning the same day
 * reconciles rather than duplicates.
 */
export type ScheduledNotification = Readonly<{
  id: string;
  typeId: NotificationTypeId;
  content: NotificationContent;
  route: NotificationRoute;
  /** Local wall-clock milliseconds, the ledger's convention throughout the app. */
  deliverAtMs: number;
}>;

/** What actually landed — the evidence the rolling-seven-day ceiling counts. */
export type DeliveryRecord = Readonly<{
  id: string;
  typeId: NotificationTypeId;
  deliveredAtMs: number;
}>;

export type ScheduleListener = (
  scheduled: readonly ScheduledNotification[],
) => void;
export type NotificationUnsubscribe = () => void;

export interface NotificationModule {
  getAuthorizationStatus(): Promise<NotificationAuthorizationStatus>;
  requestAuthorization(): Promise<NotificationAuthorizationStatus>;
  /** Idempotent per `id`: re-scheduling an identical notification changes nothing. */
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
  /** Pending notifications in delivery order. */
  getScheduled(): Promise<readonly ScheduledNotification[]>;
  /** Delivered notifications, oldest first. Trimmed to the rolling window's reach. */
  getDeliveries(): Promise<readonly DeliveryRecord[]>;
  subscribe(listener: ScheduleListener): NotificationUnsubscribe;
}

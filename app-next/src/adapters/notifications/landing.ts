import { NotificationKind, notificationKind } from './catalog';

/**
 * The landing table: each id lands on exactly one route, and never inside a ceremony, modal or
 * onboarding stack. The shield id lands on `app/locked-apps.tsx`, registered outside every guard,
 * which then decides between Home and the paywall; the lease warning lands on Home, where the
 * tap-through also asks for the walking sheet.
 */
export type NotificationRoute = '/(tabs)/settings' | '/(tabs)/home' | '/locked-apps';

export const NOTIFICATION_LANDING: Readonly<Record<NotificationKind, NotificationRoute>> = {
  trialReminder: '/(tabs)/settings',
  walkLeaseWarning: '/(tabs)/home',
  shieldOpen: '/locked-apps',
};

export type NotificationLanding = { kind: NotificationKind; route: NotificationRoute };

export function notificationLanding(identifier: string): NotificationLanding | null {
  const kind = notificationKind(identifier);
  return kind ? { kind, route: NOTIFICATION_LANDING[kind] } : null;
}

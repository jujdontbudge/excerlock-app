import { Href, router } from 'expo-router';
import { WalkingSession } from '../../domain/types';
import { Unsubscribe } from '../../ports/models';
import { Runtime } from '../../runtime/Runtime';
import { entitlementStore } from '../../state/entitlementStore';
import { permissionsStore } from '../../state/permissionsStore';
import { NotificationResponseSource } from './ExpoNotificationsAdapter';
import { NotificationRoute } from './landing';
import { createLeaseWarningScheduler } from './leaseWarningScheduler';
import { startNotificationTapThrough } from './tapThrough';
import { createTrialReminderScheduler } from './trialReminderScheduler';

/**
 * Schedules the two notifications off the app's state, whichever port implementation is bound:
 * the trial reminder follows the entitlement store and the live offer, the lease warning follows
 * the walking session, and both re-sync when the permission changes. Nothing here prompts.
 * Pending notifications outlive this binding on purpose: the reminder must survive an app kill.
 */
export function startNotificationScheduling(runtime: Runtime): Unsubscribe {
  const trial = createTrialReminderScheduler(runtime.notifications);
  const lease = createLeaseWarningScheduler(runtime.notifications);
  let session: WalkingSession | null = null;
  const canNotify = () => runtime.notifications.status() === 'granted';
  const syncTrial = () =>
    void trial.sync({
      entitlement: entitlementStore.getState().data.entitlement,
      offer: runtime.subscription.entitlement().offer,
      now: runtime.clock.now(),
      timezone: runtime.clock.timezone(),
      canNotify: canNotify(),
    });
  const syncLease = () => void lease.sync({ session, now: runtime.clock.now(), canNotify: canNotify() });
  syncTrial();
  const stops = [
    entitlementStore.subscribe(syncTrial),
    permissionsStore.subscribe(() => {
      syncTrial();
      syncLease();
    }),
    runtime.walking.observe((next) => {
      session = next;
      syncLease();
    }),
  ];
  return () => stops.forEach((stop) => stop());
}

const responsesOf = (port: Runtime['notifications']): NotificationResponseSource | null =>
  'responses' in port ? (port as { responses: NotificationResponseSource }).responses : null;

/** The runtime binding: scheduling always, tap-through whenever the bound port delivers responses. */
export function startNotifications(
  runtime: Runtime,
  options: { responses?: NotificationResponseSource | null; navigate?: (route: NotificationRoute) => void } = {},
): Unsubscribe {
  const stops = [startNotificationScheduling(runtime)];
  const responses = options.responses === undefined ? responsesOf(runtime.notifications) : options.responses;
  if (responses)
    stops.push(startNotificationTapThrough(runtime, responses, options.navigate ?? ((route) => router.push(route as Href))));
  return () => stops.reverse().forEach((stop) => stop());
}

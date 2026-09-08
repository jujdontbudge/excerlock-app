import { NotificationsPort, PendingNotification } from '../../ports/NotificationsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
export function NotificationsFake(ctx: FakeContext): NotificationsPort {
  let count = 0;
  // The demo runtime has no notification centre, so it keeps its own, which is what the developer
  // menu reads in a dev build and what the port contract checks.
  const scheduled = new Map<string, PendingNotification>();
  const schedule = async (kind: string, at: string, props: Record<string, unknown> = {}) => {
    const id = `fake-notification-${++count}`;
    scheduled.set(id, { id, at });
    ctx.log(kind, { id, at, ...props });
    return id;
  };
  return {
    status: () => permissionsStore.getState().data.notifications,
    request: () => ctx.request('notifications'),
    scheduleTrialReminder: (at, daysBefore) => schedule('trial_reminder', at, { daysBefore }),
    scheduleWalkLeaseWarning: (at, variant = 'handheld') => schedule('lease_warning', at, { variant }),
    cancel: async (id) => {
      scheduled.delete(id);
      ctx.log('notification_cancelled', { id });
    },
    pending: async () => [...scheduled.values()],
  };
}

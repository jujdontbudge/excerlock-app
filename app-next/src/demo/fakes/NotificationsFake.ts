import { NotificationsPort } from '../../ports/NotificationsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
export function NotificationsFake(ctx: FakeContext): NotificationsPort {
  let count = 0;
  const schedule = async (kind: string, at: string, props: Record<string, unknown> = {}) => {
    const id = `fake-notification-${++count}`;
    ctx.log(kind, { id, at, ...props });
    return id;
  };
  return {
    status: () => permissionsStore.getState().data.notifications,
    request: () => ctx.request('notifications'),
    scheduleTrialReminder: (at, daysBefore) => schedule('trial_reminder', at, { daysBefore }),
    scheduleWalkLeaseWarning: (at, variant = 'handheld') => schedule('lease_warning', at, { variant }),
    cancel: async (id) => {
      ctx.log('notification_cancelled', { id });
    },
  };
}

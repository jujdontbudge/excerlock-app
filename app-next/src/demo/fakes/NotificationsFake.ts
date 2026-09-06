import { NotificationsPort } from '../../ports/NotificationsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
export function NotificationsFake(ctx: FakeContext): NotificationsPort {
  let count = 0;
  const schedule = async (kind: string, at: string) => {
    const id = `fake-notification-${++count}`;
    ctx.log(kind, { id, at });
    return id;
  };
  return {
    status: () => permissionsStore.getState().data.notifications,
    request: () => ctx.request('notifications'),
    scheduleTrialReminder: (at) => schedule('trial_reminder', at),
    scheduleWalkLeaseWarning: (at) => schedule('lease_warning', at),
    cancel: async (id) => {
      ctx.log('notification_cancelled', { id });
    },
  };
}

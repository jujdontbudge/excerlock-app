import { NotificationsPort } from '../../../ports/NotificationsPort';
import { permissionsStore } from '../../../permissions/permissionsStore';
import { FakeContext } from '../FakeContext';
export function NotificationsFake(ctx: FakeContext): NotificationsPort {
  let count = 0;
  const schedule = async (kind: string, at: string) => {
    const id = `fake-notification-${++count}`;
    ctx.log(kind, { id, at });
    return id;
  };
  const pending = new Map<string, { kind: string; at: string }>();
  ctx.clock.subscribe(() => {
    for (const [id, plan] of pending)
      if (Date.parse(ctx.clock.now()) >= Date.parse(plan.at)) {
        pending.delete(id);
        ctx.log('propped_warning_fired', { id, at: plan.at });
      }
  });
  return {
    status: () => permissionsStore.getState().data.notifications,
    request: () => ctx.request('notifications'),
    scheduleTrialReminder: (at) => schedule('trial_reminder', at),
    scheduleProppedWarning: async (at) => {
      pending.set('propped_expiring', { kind: 'propped_warning', at });
      ctx.log('propped_warning_scheduled', { at });
      return 'propped_expiring';
    },
    scheduleOpenToUnlock: () => schedule('open_to_unlock', ctx.clock.now()),
    cancel: async (id) => {
      pending.delete(id);
      ctx.log('notification_cancelled', { id });
    },
  };
}

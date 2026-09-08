import { NotificationsPort } from '../../ports/NotificationsPort';
import { trialReminderAt, trialReminderDays, TrialReminderInput } from './trialReminder';

export type TrialReminderSync = TrialReminderInput & { canNotify: boolean };

/**
 * Keeps exactly one trial reminder pending while the entitlement is a trial with a known end and
 * the permission is granted, and none otherwise. Every `sync` is idempotent: an unchanged fire
 * time is a no-op, a changed one cancels the pending reminder before scheduling the next, and any
 * other state (conversion, cancellation, permission withdrawn) cancels. Port calls are serialized.
 */
export function createTrialReminderScheduler(port: NotificationsPort) {
  let pendingAt: string | null = null;
  let pendingId: string | null = null;
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => (queue = queue.then(task, task));
  const cancelPending = async () => {
    if (!pendingId) return;
    const id = pendingId;
    pendingId = null;
    await port.cancel(id);
  };
  return {
    sync(input: TrialReminderSync): Promise<void> {
      const at = input.canNotify ? trialReminderAt(input) : null;
      if (at === pendingAt) return queue;
      pendingAt = at;
      const daysBefore = trialReminderDays(input.offer);
      return enqueue(async () => {
        await cancelPending();
        if (at) pendingId = await port.scheduleTrialReminder(at, daysBefore);
      });
    },
    /** The fire time currently held, for tests and the dev menu. */
    pending: () => pendingAt,
  };
}

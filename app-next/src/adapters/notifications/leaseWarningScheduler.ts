import { WalkingSession } from '../../domain/types';
import { LeaseWarningVariant, NotificationsPort } from '../../ports/NotificationsPort';
import { leaseWarningAt, leaseWarningMoved, leaseWarningVariant, sessionIsLive } from './leaseWarning';

export type LeaseWarningSync = { session: WalkingSession | null; now: string; canNotify: boolean };

/**
 * Keeps one walk-lease warning pending at `leaseUntil − 30 s` for the live walking session. A
 * renewal moves the lease, so the warning is cancelled and rescheduled, unless the fire time moves
 * by less than five seconds. Any end (stop, lapse, window end, rule change) and a withdrawn
 * permission cancel it. It never prompts for the permission: a session is not the place to ask.
 */
export function createLeaseWarningScheduler(port: NotificationsPort) {
  let pending: { at: string; variant: LeaseWarningVariant } | null = null;
  let pendingId: string | null = null;
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => (queue = queue.then(task, task));
  const cancelPending = async () => {
    if (!pendingId) return;
    const id = pendingId;
    pendingId = null;
    await port.cancel(id);
  };
  const cancel = () => {
    if (!pending) return queue;
    pending = null;
    return enqueue(cancelPending);
  };
  return {
    sync({ session, now, canNotify }: LeaseWarningSync): Promise<void> {
      if (!canNotify || !sessionIsLive(session)) return cancel();
      const at = leaseWarningAt(session.leaseUntil);
      if (Date.parse(at) <= Date.parse(now)) return cancel();
      const variant = leaseWarningVariant(session);
      if (pending && pending.variant === variant && !leaseWarningMoved(pending.at, at)) return queue;
      pending = { at, variant };
      return enqueue(async () => {
        await cancelPending();
        pendingId = await port.scheduleWalkLeaseWarning(at, variant);
      });
    },
    cancel,
    /** The warning currently held, for tests and the dev menu. */
    pending: () => pending,
  };
}

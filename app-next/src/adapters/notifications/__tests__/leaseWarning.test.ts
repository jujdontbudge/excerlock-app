import { WalkingSession } from '../../../domain/types';
import { NotificationsPort } from '../../../ports/NotificationsPort';
import { leaseWarningAt, leaseWarningMoved, leaseWarningVariant } from '../leaseWarning';
import { createLeaseWarningScheduler } from '../leaseWarningScheduler';

const session = (leaseUntil: string, extra: Partial<WalkingSession> & { placement?: 'propped' | 'handheld' } = {}): WalkingSession => ({
  ruleId: 'walk',
  startedAt: '2026-09-07T15:00:00.000Z',
  leaseUntil,
  phase: 'walking',
  ...extra,
});

function recordingPort() {
  const calls: string[] = [];
  let count = 0;
  const port: NotificationsPort = {
    status: () => 'granted',
    request: async () => 'granted',
    scheduleTrialReminder: async () => `trial-${++count}`,
    scheduleWalkLeaseWarning: async (at, variant) => {
      calls.push(`schedule ${at} ${variant}`);
      return `lease-${++count}`;
    },
    cancel: async (id) => {
      calls.push(`cancel ${id}`);
    },
  };
  return { port, calls };
}

test('the warning fires 30 seconds before the lease lapses', () => {
  expect(leaseWarningAt('2026-09-07T15:15:00.000Z')).toBe('2026-09-07T15:14:30.000Z');
  expect(leaseWarningMoved(null, '2026-09-07T15:14:30.000Z')).toBe(true);
  expect(leaseWarningMoved('2026-09-07T15:14:30.000Z', '2026-09-07T15:14:34.999Z')).toBe(false);
  expect(leaseWarningMoved('2026-09-07T15:14:30.000Z', '2026-09-07T15:14:35.000Z')).toBe(true);
});

test('a renewal moves the warning by cancelling and rescheduling, unless it moves under five seconds', async () => {
  const { port, calls } = recordingPort();
  const scheduler = createLeaseWarningScheduler(port);
  const now = '2026-09-07T15:00:00.000Z';
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z'), now, canNotify: true });
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z'), now, canNotify: true });
  await scheduler.sync({ session: session('2026-09-07T15:15:03.000Z'), now, canNotify: true });
  expect(calls).toEqual(['schedule 2026-09-07T15:14:30.000Z handheld']);
  await scheduler.sync({ session: session('2026-09-07T15:16:00.000Z'), now, canNotify: true });
  expect(calls).toEqual([
    'schedule 2026-09-07T15:14:30.000Z handheld',
    'cancel lease-1',
    'schedule 2026-09-07T15:15:30.000Z handheld',
  ]);
  expect(scheduler.pending()).toEqual({ at: '2026-09-07T15:15:30.000Z', variant: 'handheld' });
});

test('any end reason cancels the warning, and so does a withdrawn permission', async () => {
  const { port, calls } = recordingPort();
  const scheduler = createLeaseWarningScheduler(port);
  const now = '2026-09-07T15:00:00.000Z';
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z'), now, canNotify: true });
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z', { phase: 'ended' }), now, canNotify: true });
  await scheduler.sync({ session: null, now, canNotify: true });
  expect(calls).toEqual(['schedule 2026-09-07T15:14:30.000Z handheld', 'cancel lease-1']);
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z'), now, canNotify: true });
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z'), now, canNotify: false });
  expect(calls.slice(2)).toEqual(['schedule 2026-09-07T15:14:30.000Z handheld', 'cancel lease-2']);
  expect(scheduler.pending()).toBeNull();
});

test('a session never prompts: without the permission nothing is scheduled and no request is made', async () => {
  const { port, calls } = recordingPort();
  const request = jest.spyOn(port, 'request');
  await createLeaseWarningScheduler(port).sync({
    session: session('2026-09-07T15:15:00.000Z'),
    now: '2026-09-07T15:00:00.000Z',
    canNotify: false,
  });
  expect(calls).toEqual([]);
  expect(request).not.toHaveBeenCalled();
});

test('a lease already inside its last 30 seconds gets no warning', async () => {
  const { port, calls } = recordingPort();
  await createLeaseWarningScheduler(port).sync({
    session: session('2026-09-07T15:15:00.000Z'),
    now: '2026-09-07T15:14:45.000Z',
    canNotify: true,
  });
  expect(calls).toEqual([]);
});

test('a propped session gets the scan-again variant, its only warning', async () => {
  const { port, calls } = recordingPort();
  const scheduler = createLeaseWarningScheduler(port);
  const now = '2026-09-07T15:00:00.000Z';
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z', { placement: 'propped' }), now, canNotify: true });
  expect(calls).toEqual(['schedule 2026-09-07T15:14:30.000Z propped']);
  expect(leaseWarningVariant(session('2026-09-07T15:15:00.000Z'))).toBe('handheld');
  // A handheld verification during a propped session keeps the lease but changes what renews it.
  await scheduler.sync({ session: session('2026-09-07T15:15:00.000Z', { placement: 'handheld' }), now, canNotify: true });
  expect(calls.slice(1)).toEqual(['cancel lease-1', 'schedule 2026-09-07T15:14:30.000Z handheld']);
});

import { createRuntime } from '../../runtime/createRuntime';
import { SHIELD_OPEN_NOTIFICATION_ID } from '../NotificationsPort';

test('B14 keeps two schedulable notifications plus the extension-only shield tap-through id', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const schedulable = Object.keys(runtime.notifications)
    .filter((method) => method.startsWith('schedule'))
    .sort();
  expect(schedulable).toEqual(['scheduleTrialReminder', 'scheduleWalkLeaseWarning']);
  expect(SHIELD_OPEN_NOTIFICATION_ID).toBe('excerlock.shield.open');
  expect(schedulable.some((method) => method.toLowerCase().includes('shield'))).toBe(false);
  runtime.dispose();
});

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createRuntime } from '../../runtime/createRuntime';
import { SHIELD_OPEN_NOTIFICATION_ID } from '../NotificationsPort';
import { sessionCopy } from '../../content/sessions';

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });

test('B14 keeps two schedulable notifications plus the extension-only shield tap-through id', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const schedulable = Object.keys(runtime.notifications)
    .filter((method) => method.startsWith('schedule'))
    .sort();
  expect(schedulable).toEqual(['scheduleTrialReminder', 'scheduleWalkLeaseWarning']);
  expect(SHIELD_OPEN_NOTIFICATION_ID).toBe('excerlock.shield.open');
  runtime.dispose();
});

test('the shield tap-through id is declared once and never enqueued from TypeScript', () => {
  const holders = sources(join(__dirname, '..', '..'))
    .filter((path) => !path.includes('__tests__'))
    .filter((path) => readFileSync(path, 'utf8').includes(SHIELD_OPEN_NOTIFICATION_ID))
    .map((path) => path.split('/src/')[1])
    .sort();
  expect(holders).toEqual(['ports/NotificationsPort.ts']);
});

test('the third id has a real route home rather than a dead notification', () => {
  expect(sessionCopy.shieldTapTitle).toBe(sessionCopy.shieldOpen);
  expect(sessionCopy.shieldTapBody.length).toBeGreaterThan(0);
});

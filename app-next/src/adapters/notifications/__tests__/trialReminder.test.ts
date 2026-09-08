import { trialReminderAt, trialReminderDays } from '../trialReminder';

const offer = (trialDays: number, reminderDaysBefore = 2) => ({ trialDays, reminderDaysBefore, label: 'offer' });
const trial = (renewsAt: string | null) => ({ status: 'trial' as const, renewsAt });
const now = '2026-09-07T15:00:00.000Z';
const timezone = 'America/New_York';

test('a 7-day trial is reminded two days before its end at 18:00 local', () => {
  expect(trialReminderAt({ entitlement: trial('2026-09-14T15:00:00.000Z'), offer: offer(7), now, timezone })).toBe(
    '2026-09-12T22:00:00.000Z',
  );
});

test('the reminder honours the offer and the day boundary of the local timezone', () => {
  // 03:30 UTC on the 15th is still the 14th in New York, so two days before is the 12th.
  expect(trialReminderAt({ entitlement: trial('2026-09-15T03:30:00.000Z'), offer: offer(7), now, timezone })).toBe(
    '2026-09-12T22:00:00.000Z',
  );
  expect(trialReminderAt({ entitlement: trial('2026-09-15T03:30:00.000Z'), offer: offer(7, 1), now, timezone })).toBe(
    '2026-09-13T22:00:00.000Z',
  );
  expect(trialReminderAt({ entitlement: trial('2026-09-14T15:00:00.000Z'), offer: offer(7), now, timezone: 'Europe/Paris' })).toBe(
    '2026-09-12T16:00:00.000Z',
  );
});

test('a trial shorter than three days is reminded exactly 24 hours before it ends', () => {
  expect(trialReminderAt({ entitlement: trial('2026-09-09T15:00:00.000Z'), offer: offer(2), now, timezone })).toBe(
    '2026-09-08T15:00:00.000Z',
  );
  expect(trialReminderDays(offer(2))).toBe(1);
  expect(trialReminderDays(offer(3))).toBe(2);
  expect(trialReminderDays(offer(7))).toBe(2);
});

test('nothing is scheduled without a trial, without a known end, or once the fire time has passed', () => {
  expect(trialReminderAt({ entitlement: { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' }, offer: offer(7), now, timezone })).toBeNull();
  expect(trialReminderAt({ entitlement: trial(null), offer: offer(7), now, timezone })).toBeNull();
  expect(trialReminderAt({ entitlement: trial('not a date'), offer: offer(7), now, timezone })).toBeNull();
  expect(
    trialReminderAt({ entitlement: trial('2026-09-14T15:00:00.000Z'), offer: offer(7), now: '2026-09-12T22:00:00.000Z', timezone }),
  ).toBeNull();
});

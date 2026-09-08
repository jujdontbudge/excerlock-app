import { streak } from '../streak';
import { pruneRuleDays, sealDays } from '../sealDay';
import { addDays } from '../calendar';
import { rule } from './fixtures';

test('a scheduled day the app never opened seals as missed and breaks the streak', () => {
  const history = sealDays({
    history: [
      {
        day: '2026-09-04',
        usageMinutes: 30,
        activity: { walking: 5000, gym: 0, running: 0, biking: 0 },
        met: true,
        scheduled: true,
        sealedAt: '2026-09-05T00:00:00.000Z',
      },
    ],
    rules: [rule],
    ruleDays: [],
    lastSealedDay: '2026-09-04',
    today: '2026-09-08',
    timezone: 'UTC',
    sealedAt: '2026-09-08T12:00:00.000Z',
  });

  expect(history.find((day) => day.day === '2026-09-07')).toMatchObject({
    scheduled: true,
    met: false,
    sealedAt: '2026-09-08T12:00:00.000Z',
  });
  expect(streak(history, '2026-09-08')).toEqual({ current: 0, longest: 1 });
});

test('sealing is immutable and idempotent', () => {
  const first = sealDays({
    history: [],
    rules: [rule],
    ruleDays: [{ ruleId: rule.id, day: '2026-09-07', progress: 5000, met: true, metAt: '2026-09-07T14:00:00.000Z' }],
    lastSealedDay: '2026-09-06',
    today: '2026-09-08',
    timezone: 'UTC',
    sealedAt: '2026-09-08T00:00:00.000Z',
  });
  const second = sealDays({
    history: first,
    rules: [rule],
    ruleDays: [],
    lastSealedDay: '2026-09-07',
    today: '2026-09-08',
    timezone: 'UTC',
    sealedAt: '2026-09-08T12:00:00.000Z',
  });

  expect(second).toEqual(first);
});

test('rollover retention keeps thirty-five rule days', () => {
  const ruleDays = Array.from({ length: 40 }, (_, index) => ({
    ruleId: rule.id,
    day: addDays('2026-07-30', index),
    progress: 0,
    met: false,
    metAt: null,
  }));
  expect(pruneRuleDays(ruleDays, '2026-09-07')).toHaveLength(35);
});

test('sealing reaches back no further than the retention floor', () => {
  const history = sealDays({
    history: [],
    rules: [rule],
    ruleDays: [{ ruleId: rule.id, day: '2024-01-01', progress: 0, met: false, metAt: null }],
    lastSealedDay: null,
    today: '2026-09-08',
    timezone: 'UTC',
    sealedAt: '2026-09-08T12:00:00.000Z',
  });

  expect(history[0].day).toBe(addDays('2026-09-08', -400));
});

test('a day that is already sealed keeps the stamp it was sealed with', () => {
  const history = sealDays({
    history: [
      {
        day: '2026-09-06',
        usageMinutes: 30,
        activity: { walking: 5000, gym: 0, running: 0, biking: 0 },
        met: true,
        scheduled: true,
        sealedAt: '2026-09-07T00:00:00.000Z',
      },
    ],
    rules: [rule],
    ruleDays: [],
    lastSealedDay: '2026-09-05',
    today: '2026-09-08',
    timezone: 'UTC',
    sealedAt: '2026-09-08T12:00:00.000Z',
  });

  expect(history.find((day) => day.day === '2026-09-06')?.sealedAt).toBe('2026-09-07T00:00:00.000Z');
});

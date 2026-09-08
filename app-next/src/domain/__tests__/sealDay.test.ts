import { streak } from '../streak';
import { pruneEarnedUnlocks, pruneRuleDays, sealDays } from '../sealDay';
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

test('rollover retention keeps thirty-five rule days and two earned-unlock days', () => {
  const ruleDays = Array.from({ length: 40 }, (_, index) => ({
    ruleId: rule.id,
    day: addDays('2026-07-30', index),
    progress: 0,
    met: false,
    metAt: null,
  }));
  const unlocks = [
    { day: '2026-09-05', id: 'old' },
    { day: '2026-09-06', id: 'yesterday' },
    { day: '2026-09-07', id: 'today' },
  ];

  expect(pruneRuleDays(ruleDays, '2026-09-07')).toHaveLength(35);
  expect(pruneEarnedUnlocks(unlocks, '2026-09-07').map((row) => row.id)).toEqual(['yesterday', 'today']);
});

test('sealing reaches back four hundred days at most and never restamps a sealed day', () => {
  const sealedLongAgo = {
    day: '2026-09-06',
    usageMinutes: 30,
    activity: { walking: 5000, gym: 0, running: 0, biking: 0 },
    met: true,
    scheduled: true,
    sealedAt: '2026-09-07T00:00:00.000Z',
  };
  const history = sealDays({
    history: [sealedLongAgo],
    rules: [rule],
    ruleDays: [],
    // Two years dark: sealing starts at the four-hundred-day boundary, not at the last sealed day.
    lastSealedDay: '2024-09-07',
    today: '2026-09-08',
    timezone: 'UTC',
    sealedAt: '2026-09-08T12:00:00.000Z',
  });

  expect(history[0].day).toBe(addDays('2026-09-08', -400));
  expect(history.find((day) => day.day === '2026-09-06')).toEqual(sealedLongAgo);
});

import { resetTodaysProgress } from '../resetToday';
import { historyStore } from '../../../state/historyStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';

const clock = { now: () => '2026-09-08T14:00:00.000Z', timezone: () => 'UTC' };

const row = (day: string, met = true) => ({ ruleId: 'r1', day, progress: 4_000, met, metAt: met ? `${day}T09:00:00.000Z` : null });
const unlock = (day: string) => ({ day, ruleId: 'r1', ruleName: 'Morning walk', metAt: `${day}T09:00:00.000Z`, windowEnd: `${day}T18:00:00.000Z` });
const historyDay = (day: string) => ({
  day,
  usageMinutes: 42,
  activity: { walking: 3_000, gym: 20, running: 0, biking: 0 },
  met: true,
  scheduled: true,
});

beforeEach(() => {
  ruleDaysStore.getState().reset();
  historyStore.getState().reset();
});

test('today is the only day it forgets, because yesterday is evidence', () => {
  ruleDaysStore.getState().patch({
    days: [row('2026-09-07'), row('2026-09-08')],
    earnedUnlocks: [unlock('2026-09-07'), unlock('2026-09-08')],
  });

  resetTodaysProgress(clock);

  const { days, earnedUnlocks } = ruleDaysStore.getState().data;
  expect(days.map((day) => day.day)).toEqual(['2026-09-07']);
  expect(earnedUnlocks.map((earned) => earned.day)).toEqual(['2026-09-07']);
});

test('a walking session in flight is ended, so the next scan starts from nothing', () => {
  ruleDaysStore.getState().patch({
    walkingSession: {
      id: 'w1',
      ruleId: 'r1',
      placement: 'handheld',
      instanceDay: '2026-09-08',
      startedAt: '2026-09-08T13:00:00.000Z',
      verifiedAt: '2026-09-08T13:01:00.000Z',
      leaseUntil: '2026-09-08T13:15:00.000Z',
      creditedThrough: '2026-09-08T13:10:00.000Z',
      endedAt: null,
      endReason: null,
      phase: 'walking',
    },
  });

  resetTodaysProgress(clock);

  expect(ruleDaysStore.getState().data.walkingSession).toBeNull();
});

test("today's history row goes back to zero rather than disappearing", () => {
  historyStore.getState().patch({ days: [historyDay('2026-09-07'), historyDay('2026-09-08')] });

  resetTodaysProgress(clock);

  const days = historyStore.getState().data.days;
  expect(days.map((day) => day.day)).toEqual(['2026-09-07', '2026-09-08']);
  expect(days[1]).toMatchObject({
    day: '2026-09-08',
    usageMinutes: null,
    activity: { walking: 0, gym: 0, running: 0, biking: 0 },
    met: false,
  });
  // The schedule is a fact about the rules, not about what the tester did today.
  expect(days[1].scheduled).toBe(true);
});

test('a day the app has no row for is left alone', () => {
  resetTodaysProgress(clock);

  expect(historyStore.getState().data.days).toEqual([]);
  expect(ruleDaysStore.getState().data.days).toEqual([]);
});

test('the local timezone decides which day today is, not UTC', () => {
  ruleDaysStore.getState().patch({ days: [row('2026-09-08'), row('2026-09-09')] });

  // 14:00 UTC is already the 9th in Auckland.
  resetTodaysProgress({ now: clock.now, timezone: () => 'Pacific/Auckland' });

  expect(ruleDaysStore.getState().data.days.map((day) => day.day)).toEqual(['2026-09-08']);
});

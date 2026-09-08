import { mergedLockIntervals } from '../lockIntervals';
import { assertMonitorBudget, compileMonitorPlan, LOCK_WINDOW_BUDGET, monitorNameForLockWindow } from '../monitorPlan';
import { MIN_WINDOW_MINUTES } from '../validateRule';
import { Rule } from '../types';
import { rule } from './fixtures';

test('five daily rules compile to the lock-window budget rather than one monitor per rule', () => {
  const rules: Rule[] = Array.from({ length: 5 }, (_, index) => ({
    ...rule,
    id: `rule-${index}`,
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'allDay' } },
  }));
  const intervals = mergedLockIntervals(rules, '2026-09-07', 30, 'UTC');
  const plan = compileMonitorPlan(intervals, '2026-09-07T00:00:00.000Z', LOCK_WINDOW_BUDGET);
  expect(plan.monitors.length).toBeLessThanOrEqual(LOCK_WINDOW_BUDGET);
  expect(plan.monitors).toHaveLength(1);
  expect(plan.truncatedAt).toBeNull();
});

test('truncation names the first uncovered interval and fails closed', () => {
  const intervals = Array.from({ length: 18 }, (_, index) => ({
    start: new Date(Date.UTC(2026, 8, 7 + index, 9)).toISOString(),
    end: new Date(Date.UTC(2026, 8, 7 + index, 10)).toISOString(),
    ruleIds: [`rule-${index}`],
    timezone: 'UTC',
  }));
  const plan = compileMonitorPlan(intervals, '2026-09-07T00:00:00.000Z', LOCK_WINDOW_BUDGET);
  expect(plan.monitors).toHaveLength(16);
  expect(plan.truncatedAt).toBe(intervals[16].start);
  expect(plan.horizonEnd).toBe(intervals.at(-1)?.end);
  expect(assertMonitorBudget(plan)).toEqual({
    applied: false,
    shields: 'up',
    monitors: 16,
    reason: 'monitorBudget',
  });
});

test('compiled intervals are chronological absolute monitors at least thirty minutes long', () => {
  const intervals = [
    {
      start: '2026-09-07T12:00:00.000Z',
      end: '2026-09-07T12:30:00.000Z',
      ruleIds: ['later'],
      timezone: 'UTC',
    },
    {
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T10:00:00.000Z',
      ruleIds: ['early'],
      timezone: 'UTC',
    },
  ];
  const plan = compileMonitorPlan(intervals, '2026-09-07T00:00:00.000Z', LOCK_WINDOW_BUDGET);
  expect(plan.monitors.map((monitor) => monitor.start)).toEqual([
    '2026-09-07T09:00:00.000Z',
    '2026-09-07T12:00:00.000Z',
  ]);
  for (const monitor of plan.monitors) {
    expect(Date.parse(monitor.end) - Date.parse(monitor.start)).toBeGreaterThanOrEqual(MIN_WINDOW_MINUTES * 60_000);
    expect(monitor.repeats).toBe(false);
    expect(monitor.name).toBe(monitorNameForLockWindow(monitor));
  }
});

test('plan hashes and monitor names are stable and cover timezone', () => {
  const interval = {
    start: '2026-09-07T09:00:00.000Z',
    end: '2026-09-07T10:00:00.000Z',
    ruleIds: ['b', 'a'],
    timezone: 'UTC',
  };
  const first = compileMonitorPlan([interval], '2026-09-07T00:00:00.000Z', LOCK_WINDOW_BUDGET);
  const reordered = compileMonitorPlan(
    [{ ...interval, ruleIds: ['a', 'b'] }],
    '2026-09-07T00:00:00.000Z',
    LOCK_WINDOW_BUDGET,
  );
  const differentZone = compileMonitorPlan(
    [{ ...interval, timezone: 'America/New_York' }],
    '2026-09-07T00:00:00.000Z',
    LOCK_WINDOW_BUDGET,
  );
  expect(first).toEqual(reordered);
  expect(first.planHash).not.toBe(differentZone.planHash);
});

test('the default budget handles empty, ended, tied, and invalid intervals explicitly', () => {
  const tied = [
    {
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T11:00:00.000Z',
      ruleIds: ['long'],
      timezone: 'UTC',
    },
    {
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T10:00:00.000Z',
      ruleIds: ['short'],
      timezone: 'UTC',
    },
  ];
  expect(compileMonitorPlan([], '2026-09-07T00:00:00.000Z')).toMatchObject({
    monitors: [],
    horizonEnd: '2026-09-07T00:00:00.000Z',
  });
  expect(compileMonitorPlan(tied, '2026-09-07T00:00:00.000Z').monitors.map((monitor) => monitor.end)).toEqual([
    '2026-09-07T10:00:00.000Z',
    '2026-09-07T11:00:00.000Z',
  ]);
  expect(compileMonitorPlan(tied, '2026-09-07T11:00:00.000Z').monitors).toEqual([]);
  expect(() =>
    compileMonitorPlan([{ ...tied[0], end: '2026-09-07T09:20:00.000Z' }], '2026-09-07T00:00:00.000Z'),
  ).toThrow('monitorIntervalTooShort');
});

import { LockInterval } from './lockIntervals';
import { MIN_WINDOW_MINUTES } from './validateRule';

export const LOCK_WINDOW_BUDGET = 16;

export type LockWindowMonitor = LockInterval & {
  name: string;
  repeats: false;
};

export type MonitorPlan = {
  monitors: LockWindowMonitor[];
  horizonEnd: string;
  truncatedAt: string | null;
  planHash: string;
};

const hash = (value: string) => {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
};

const identity = (interval: LockInterval) =>
  JSON.stringify({
    start: interval.start,
    end: interval.end,
    ruleIds: [...interval.ruleIds].sort(),
    timezone: interval.timezone,
  });

export function monitorNameForLockWindow(interval: LockInterval): string {
  return `excerlock.lock.${hash(identity(interval))}`;
}

export function compileMonitorPlan(intervals: LockInterval[], now: string, budget = LOCK_WINDOW_BUDGET): MonitorPlan {
  const chronological = intervals
    .filter((interval) => Date.parse(interval.end) > Date.parse(now))
    .map((interval) => ({ ...interval, ruleIds: [...interval.ruleIds].sort() }))
    .sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end));
  if (
    chronological.some(
      (interval) => Date.parse(interval.end) - Date.parse(interval.start) < MIN_WINDOW_MINUTES * 60_000,
    )
  )
    throw new Error('monitorIntervalTooShort');
  const limit = Math.max(0, Math.floor(budget));
  return {
    monitors: chronological.slice(0, limit).map((interval) => ({
      ...interval,
      name: monitorNameForLockWindow(interval),
      repeats: false,
    })),
    horizonEnd: chronological.at(-1)?.end ?? now,
    truncatedAt: chronological.length > limit ? chronological[limit].start : null,
    planHash: hash(chronological.map(identity).join('|')),
  };
}

export function assertMonitorBudget(plan: MonitorPlan) {
  return plan.truncatedAt
    ? ({
        applied: false,
        shields: 'up' as const,
        monitors: plan.monitors.length,
        reason: 'monitorBudget' as const,
      } as const)
    : ({ applied: true, shields: 'up' as const, monitors: plan.monitors.length } as const);
}

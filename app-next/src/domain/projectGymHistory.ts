import type { GymInterval } from './gymMachine';
import type { Rule, RuleDay } from './types';
import { addDays, dayKey, localInstant } from './calendar';
import { windowInstances } from './schedule';
import { applyProgress } from './progress';

type Segment = { start: number; end: number };

export function measuredGymMinutesByDay(
  intervals: readonly GymInterval[], configuredRegionIds: readonly string[], timezone: string, now: string,
): Readonly<Record<string, number>> {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error('Invalid gym history observation time');
  const configured = new Set(configuredRegionIds);
  const eligible = intervals.filter((interval) => { validateInterval(interval); return configured.has(interval.regionId) && interval.confirmedAt <= nowMs; });
  const byDay = splitByLocalDay(union(eligible.map(interval => ({ start: interval.confirmedAt, end: Math.min(interval.exitedAt ?? nowMs, nowMs) }))), timezone);
  return Object.fromEntries([...byDay].map(([day, segments]) => [day, segments.reduce((sum, segment) => sum + (segment.end - segment.start) / 60_000, 0)]));
}

/**
 * Projects confirmed geofence intervals into earned gym rule progress.
 *
 * Configured region ids are explicit so deleted/stale regions never earn.
 * Dwell is unioned across regions before local-day splitting, preventing
 * overlapping gyms from double-crediting the same wall-clock time.
 */
export function projectGymHistory(
  rules: readonly Rule[],
  rows: readonly RuleDay[],
  intervals: readonly GymInterval[],
  configuredRegionIds: readonly string[],
  timezone: string,
  now: string,
): RuleDay[] {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error('Invalid gym history observation time');
  const configured = new Set(configuredRegionIds);
  const eligible = intervals.filter((interval) => {
    validateInterval(interval);
    return configured.has(interval.regionId) && interval.confirmedAt <= nowMs;
  });
  const byDay = splitByLocalDay(
    union(eligible.map((interval) => ({ start: interval.confirmedAt, end: Math.min(interval.exitedAt ?? nowMs, nowMs) }))),
    timezone,
  );
  const confirmations = new Map<string, number>();
  for (const interval of eligible) {
    const day = dayKey(new Date(interval.confirmedAt).toISOString(), timezone);
    confirmations.set(day, Math.min(confirmations.get(day) ?? Infinity, interval.confirmedAt));
  }
  const days = new Set([...byDay.keys(), ...confirmations.keys()]);
  const result = [...rows];
  for (const day of [...days].sort()) {
    for (const rule of rules) {
      if (!rule.enabled || rule.activity !== 'gym' || !windowInstances(rule, day, timezone).length) continue;
      const index = result.findIndex((row) => row.ruleId === rule.id && row.day === day);
      const row = index < 0 ? { ruleId: rule.id, day, progress: 0, met: false, metAt: null } : result[index];
      let next: RuleDay;
      if (rule.mode.kind === 'event') {
        const confirmedAt = confirmations.get(day);
        if (confirmedAt === undefined) continue;
        next = applyProgress(rule, row, 1, new Date(confirmedAt).toISOString());
      } else if (rule.mode.kind === 'target' && rule.mode.activity === 'gym' && rule.mode.metric === 'minutes') {
        const segments = byDay.get(day) ?? [];
        const minutes = segments.reduce((sum, segment) => sum + (segment.end - segment.start) / 60_000, 0);
        if (minutes <= 0 && index < 0) continue;
        const earnedAt = thresholdTime(segments, rule.mode.goal * 60_000) ?? nowMs;
        next = applyProgress(rule, row, Math.max(row.progress, minutes), new Date(earnedAt).toISOString());
      } else continue;
      if (index < 0) result.push(next);
      else result[index] = next;
    }
  }
  return result;
}

function validateInterval(interval: GymInterval): void {
  if (!interval.id || !interval.regionId || !Number.isFinite(interval.enteredAt) ||
    !Number.isFinite(interval.confirmedAt) || interval.confirmedAt < interval.enteredAt ||
    (interval.exitedAt !== null && (!Number.isFinite(interval.exitedAt) || interval.exitedAt < interval.confirmedAt)))
    throw new Error('Invalid measured gym interval');
}

function union(segments: Segment[]): Segment[] {
  const sorted = segments.filter(({ end, start }) => end > start).sort((a, b) => a.start - b.start || a.end - b.end);
  const result: Segment[] = [];
  for (const segment of sorted) {
    const previous = result[result.length - 1];
    if (previous && segment.start <= previous.end) previous.end = Math.max(previous.end, segment.end);
    else result.push({ ...segment });
  }
  return result;
}

function splitByLocalDay(segments: readonly Segment[], timezone: string): Map<string, Segment[]> {
  const result = new Map<string, Segment[]>();
  for (const segment of segments) {
    let cursor = segment.start;
    while (cursor < segment.end) {
      const day = dayKey(new Date(cursor).toISOString(), timezone);
      const midnight = Date.parse(localInstant(addDays(day, 1), 0, timezone));
      if (!Number.isFinite(midnight) || midnight <= cursor) throw new Error('Invalid gym local-day boundary');
      const part = { start: cursor, end: Math.min(segment.end, midnight) };
      result.set(day, [...(result.get(day) ?? []), part]);
      cursor = part.end;
    }
  }
  return result;
}

function thresholdTime(segments: readonly Segment[], neededMs: number): number | null {
  let remaining = neededMs;
  for (const segment of segments) {
    const duration = segment.end - segment.start;
    if (remaining <= duration) return segment.start + remaining;
    remaining -= duration;
  }
  return null;
}

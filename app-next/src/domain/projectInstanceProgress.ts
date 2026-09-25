import type { Rule, RuleDay } from './types';
import type { GymInterval } from './gymMachine';
import { addDays, dayKey, localDayStart } from './calendar';
import { windowInstances } from './schedule';
import { applyProgress } from './progress';
import { progressDay } from './progressDay';

export type ExactStepMeasurement = { from: number; through: number; steps: number; timezone: string };
export type StepMeasurementRange = { key: string; from: number; to: number; timezone: string };
export type VerifiedDurationSegment = { from: number; to: number; day: string; timezone: string };
type AccountingInstance = { rule: Rule; day: string; from: number; to: number; end: number };

function accountingInstances(rules: readonly Rule[], now: string, timezone: string): AccountingInstance[] {
  const today = dayKey(now, timezone);
  const at = Date.parse(now);
  const result: AccountingInstance[] = [];
  for (const day of [addDays(today, -1), today]) {
    for (const rule of rules) {
      if (!rule.enabled || (Number.isFinite(Date.parse(rule.createdAt)) && dayKey(rule.createdAt, timezone) > day))
        continue;
      for (const instance of windowInstances(rule, day, timezone)) {
        const ownedDay = progressDay(rule, instance.start, timezone);
        if (ownedDay === null) continue;
        const from = Date.parse(localDayStart(day, timezone));
        const end = Date.parse(instance.end);
        const to = Math.min(at, end);
        if (to > from) result.push({ rule, day: ownedDay, from, to, end });
      }
    }
  }
  return result;
}
const stepKey = (instance: AccountingInstance, timezone: string) => `${timezone}:${instance.from}:${instance.end}`;

export function planStepInstanceMeasurements(
  rules: readonly Rule[],
  now: string,
  timezone: string,
  sealedDays: ReadonlySet<string> = new Set(),
): StepMeasurementRange[] {
  const ranges = new Map<string, StepMeasurementRange>();
  for (const instance of accountingInstances(rules, now, timezone)) {
    const mode = instance.rule.mode;
    if (
      sealedDays.has(instance.day) ||
      mode.kind !== 'target' ||
      mode.activity !== 'walking' ||
      mode.metric !== 'steps'
    )
      continue;
    const key = stepKey(instance, timezone);
    ranges.set(key, { key, from: instance.from, to: instance.to, timezone });
  }
  return [...ranges.values()];
}

export function projectInstanceProgress(
  rules: readonly Rule[],
  previous: readonly RuleDay[],
  steps: Readonly<Record<string, ExactStepMeasurement>>,
  walking: readonly VerifiedDurationSegment[],
  gym: readonly GymInterval[],
  configuredRegionIds: readonly string[],
  timezone: string,
  now: string,
  sealedDays: ReadonlySet<string> = new Set(),
): RuleDay[] {
  const rows = [...previous];
  const configured = new Set(configuredRegionIds);
  for (const instance of accountingInstances(rules, now, timezone)) {
    const { rule, day, from, to } = instance;
    if (sealedDays.has(day)) continue;
    const mode = rule.mode;
    let progress: number | null = null;
    let measuredAt = to;
    if (mode.kind === 'target' && mode.activity === 'walking' && mode.metric === 'steps') {
      const sample = steps[stepKey(instance, timezone)];
      if (
        sample &&
        sample.from === from &&
        sample.through <= to &&
        sample.through > from &&
        sample.timezone === timezone
      ) {
        if (!Number.isSafeInteger(sample.steps) || sample.steps < 0)
          throw new Error('Invalid instance step measurement');
        progress = sample.steps;
        measuredAt = sample.through;
      }
    } else if (mode.kind === 'target' && mode.activity === 'gym' && mode.metric === 'minutes') {
      const intervals = gym
        .filter((visit) => configured.has(visit.regionId))
        .map((visit) => ({ from: visit.confirmedAt, to: visit.exitedAt ?? Date.parse(now) }));
      const measured = clippedDuration(intervals, from, to, mode.goal * 60_000);
      progress = measured.milliseconds / 60_000;
      measuredAt = measured.thresholdAt ?? to;
    } else if (mode.kind === 'event' && mode.activity === 'gym') {
      const confirmation = gym
        .filter(
          (visit) =>
            configured.has(visit.regionId) &&
            visit.confirmedAt >= from &&
            visit.confirmedAt <= to &&
            visit.confirmedAt < instance.end,
        )
        .map((visit) => visit.confirmedAt)
        .sort((a, b) => a - b)[0];
      if (confirmation !== undefined) {
        progress = 1;
        measuredAt = confirmation;
      }
    }
    if (progress === null) continue;
    const index = rows.findIndex((row) => row.ruleId === rule.id && row.day === day);
    const row = index < 0 ? { ruleId: rule.id, day, progress: 0, met: false, metAt: null } : rows[index];
    const next = applyProgress(rule, row, Math.max(row.progress, progress), new Date(measuredAt).toISOString());
    if (index < 0) rows.push(next);
    else rows[index] = next;
  }
  const walkingGroups = new Map<string, { rule: Rule; day: string; intervals: { from: number; to: number }[] }>();
  for (const segment of walking) {
    if (segment.from >= Date.parse(now) || (sealedDays.has(segment.day) && sealedDays.has(addDays(segment.day, -1))))
      continue;
    for (const instance of accountingInstances(rules, new Date(segment.from + 1).toISOString(), segment.timezone)) {
      const mode = instance.rule.mode;
      if (sealedDays.has(instance.day)) continue;
      if (mode.kind !== 'target' || mode.activity !== 'walking' || mode.metric !== 'minutes') continue;
      const from = Math.max(segment.from, instance.from);
      const to = Math.min(segment.to, instance.end, Date.parse(now));
      if (to <= from) continue;
      const key = JSON.stringify([instance.rule.id, instance.day]);
      const group = walkingGroups.get(key) ?? { rule: instance.rule, day: instance.day, intervals: [] };
      group.intervals.push({ from, to });
      walkingGroups.set(key, group);
    }
  }
  for (const { rule, day, intervals } of walkingGroups.values()) {
    if (rule.mode.kind !== 'target') continue;
    const measured = clippedDuration(intervals, Number.MIN_SAFE_INTEGER, Date.parse(now), rule.mode.goal * 60_000);
    const index = rows.findIndex((row) => row.ruleId === rule.id && row.day === day);
    const row = index < 0 ? { ruleId: rule.id, day, progress: 0, met: false, metAt: null } : rows[index];
    const next = applyProgress(
      rule,
      row,
      Math.max(row.progress, measured.milliseconds / 60_000),
      new Date(
        measured.thresholdAt ??
          intervals.reduce((latest, interval) => Math.max(latest, interval.to), Number.MIN_SAFE_INTEGER),
      ).toISOString(),
    );
    if (index < 0) rows.push(next);
    else rows[index] = next;
  }
  return rows;
}

function clippedDuration(
  intervals: readonly { from: number; to: number }[],
  from: number,
  to: number,
  threshold: number,
) {
  const clipped = intervals
    .map((interval) => {
      if (!Number.isFinite(interval.from) || !Number.isFinite(interval.to) || interval.to < interval.from)
        throw new Error('Invalid measured duration interval');
      return { from: Math.max(from, interval.from), to: Math.min(to, interval.to) };
    })
    .filter((interval) => interval.to > interval.from)
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const union: { from: number; to: number }[] = [];
  for (const interval of clipped) {
    const last = union[union.length - 1];
    if (last && interval.from <= last.to) last.to = Math.max(last.to, interval.to);
    else union.push({ ...interval });
  }
  let milliseconds = 0;
  let thresholdAt: number | null = null;
  for (const interval of union) {
    if (thresholdAt === null && milliseconds + interval.to - interval.from >= threshold)
      thresholdAt = interval.from + threshold - milliseconds;
    milliseconds += interval.to - interval.from;
  }
  return { milliseconds, thresholdAt };
}

export function walkingAccountingDeadlines(
  rules: readonly Rule[],
  segments: readonly VerifiedDurationSegment[],
  now: string,
  cursorTimezone?: string,
): Record<string, number> {
  const at = Date.parse(now);
  const timezones = new Set(
    segments.filter((segment) => segment.to >= at - 48 * 3600_000).map((segment) => segment.timezone),
  );
  if (cursorTimezone) timezones.add(cursorTimezone);
  const result: Record<string, number> = {};
  for (const timezone of timezones) {
    for (const instance of accountingInstances(rules, now, timezone)) {
      const mode = instance.rule.mode;
      if (mode.kind !== 'target' || mode.activity !== 'walking' || mode.metric !== 'minutes' || instance.end <= at)
        continue;
      result[instance.day] = Math.max(result[instance.day] ?? 0, instance.end);
    }
  }
  return result;
}

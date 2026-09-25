import type { HistoryDay } from '../model/models';
import type { Rule, RuleDay } from '../model/types';
import { addDays, dayKey } from '../schedule/calendar';
import { windowInstances } from '../schedule/schedule';

export type SealedHistoryDay = HistoryDay & { sealedAt: string };
export type HistoryArchive = { startedDay: string | null; days: SealedHistoryDay[] };

export function sealDays(
  archive: HistoryArchive,
  measured: readonly HistoryDay[],
  rules: readonly Rule[],
  timezone: string,
  now: string,
  deferUntil: Readonly<Record<string, number>> = {},
): HistoryArchive {
  const today = dayKey(now, timezone);
  const cutoff = addDays(today, -399);
  const startedDay = archive.startedDay ?? measured.map((row) => row.day).sort()[0] ?? today;
  const existing = new Map(archive.days.filter((row) => row.day >= cutoff).map((row) => [row.day, row]));
  const facts = new Map(measured.map((row) => [row.day, row]));
  for (let day = startedDay < cutoff ? cutoff : startedDay; day < today; day = addDays(day, 1)) {
    if (existing.has(day) || (deferUntil[day] ?? -Infinity) > Date.parse(now)) continue;
    if (
      rules.some((rule) =>
        windowInstances(rule, day, timezone).some((instance) => Date.parse(instance.end) > Date.parse(now)),
      )
    )
      continue;
    const row = facts.get(day) ?? {
      day,
      usageMinutes: null,
      activity: { walking: 0, gym: 0 },
      met: false,
      scheduled: rules.some(
        (rule) =>
          rule.enabled &&
          (!Number.isFinite(Date.parse(rule.createdAt)) || dayKey(rule.createdAt, timezone) <= day) &&
          windowInstances(rule, day, timezone).length > 0,
      ),
    };
    existing.set(day, { ...row, activity: { ...row.activity }, sealedAt: now });
  }
  return { startedDay, days: [...existing.values()].sort((a, b) => a.day.localeCompare(b.day)) };
}

export function retainRuleDays(
  previous: readonly RuleDay[],
  projected: readonly RuleDay[],
  archive: HistoryArchive,
  today: string,
): RuleDay[] {
  const cutoff = addDays(today, -34);
  return preserveSealedRuleDays(previous, projected, archive)
    .filter((row) => row.day >= cutoff)
    .sort((a, b) => a.day.localeCompare(b.day) || a.ruleId.localeCompare(b.ruleId));
}

export function preserveSealedRuleDays(
  previous: readonly RuleDay[],
  projected: readonly RuleDay[],
  archive: HistoryArchive,
): RuleDay[] {
  const sealed = new Set(archive.days.map((row) => row.day));
  return [...previous.filter((row) => sealed.has(row.day)), ...projected.filter((row) => !sealed.has(row.day))];
}

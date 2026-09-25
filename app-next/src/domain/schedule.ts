import { Rule, DayKey } from './types';
import { dayKey, addDays, resolveLocalInstant } from './calendar';
export { dayKey } from './calendar';
export type WindowInstance = { ruleId: string; day: DayKey; start: string; end: string };
export function windowInstances(rule: Rule, day: DayKey, timezone: string): WindowInstance[] {
  if (!rule.enabled || !rule.schedule.days.includes(new Date(`${day}T12:00:00Z`).getUTCDay() as 0)) return [];
  const w = rule.schedule.window;
  const start = w.kind === 'allDay' ? 0 : w.startMinute;
  const end = w.kind === 'allDay' ? 1440 : w.endMinute;
  const resolvedStart = resolveLocalInstant(day, start, timezone);
  const resolvedEnd = resolveLocalInstant(end <= start || end === 1440 ? addDays(day, 1) : day, end === 1440 ? 0 : end, timezone);
  if (Date.parse(resolvedEnd.instant) <= Date.parse(resolvedStart.instant)) return [];
  return [
    {
      ruleId: rule.id,
      day,
      start: resolvedStart.instant,
      end: resolvedEnd.instant,
    },
  ];
}
export function currentInstances(rule: Rule, now: string, tz: string): WindowInstance[] {
  const day = dayKey(now, tz),
    instant = Date.parse(now);
  return [addDays(day, -1), day]
    .flatMap((d) => windowInstances(rule, d, tz))
    .filter((w) => Date.parse(w.start) <= instant && instant < Date.parse(w.end));
}
export function isActiveAt(rule: Rule, now: string, tz: string): boolean {
  return currentInstances(rule, now, tz).length > 0;
}
export function nextInstanceStart(rules: Rule[], after: string, tz: string): string | null {
  const day = dayKey(after, tz),
    instant = Date.parse(after);
  const starts = Array.from({ length: 8 }, (_, i) => addDays(day, i))
    .flatMap((d) => rules.flatMap((r) => windowInstances(r, d, tz)))
    .map((w) => w.start)
    .filter((s) => Date.parse(s) > instant)
    .sort();
  return starts[0] ?? null;
}

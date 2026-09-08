import { Answers } from '../../onboarding/types';
import { Schedule, Weekday } from '../../domain/types';
import { MIN_WINDOW_MINUTES } from '../../domain/validateRule';
export type ScheduleDraft = { days: Weekday[]; allDay: boolean; start: number; end: number };
export type ScheduleAction =
  { type: 'days'; value: Weekday[] } | { type: 'allDay'; value: boolean } | { type: 'start' | 'end'; value: number };
export function scheduleDraft(a: Answers): ScheduleDraft {
  return {
    days: (a.days ?? [1, 2, 3, 4, 5]) as Weekday[],
    allDay: a.allDay === true,
    start: Number(a.startMinute ?? 540),
    end: Number(a.endMinute ?? 1260),
  };
}
export function reduceSchedule(d: ScheduleDraft, a: ScheduleAction): ScheduleDraft {
  return { ...d, [a.type]: a.value };
}
export function toSchedule(d: ScheduleDraft): Schedule {
  return {
    days: d.days,
    window: d.allDay ? { kind: 'allDay' } : { kind: 'range', startMinute: d.start, endMinute: d.end },
  };
}
export function scheduleIssues(d: ScheduleDraft): ('days' | 'window')[] {
  const issues: ('days' | 'window')[] = [];
  if (
    !d.days.length ||
    new Set(d.days).size !== d.days.length ||
    d.days.some((n) => !Number.isInteger(n) || n < 0 || n > 6)
  )
    issues.push('days');
  if (
    !d.allDay &&
    (![d.start, d.end].every((n) => Number.isInteger(n) && n >= 0 && n < 1440) || (d.end - d.start + 1440) % 1440 < MIN_WINDOW_MINUTES)
  )
    issues.push('window');
  return issues;
}
export function scheduleAnswers(d: ScheduleDraft): Answers {
  return { days: d.days, allDay: d.allDay, startMinute: d.start, endMinute: d.end };
}

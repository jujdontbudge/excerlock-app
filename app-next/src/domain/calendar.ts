import { DayKey } from './types';
export function dayKey(instant: string, timezone: string): DayKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
export function addDays(day: DayKey, amount: number): DayKey {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function localInstant(day: DayKey, minute: number, timezone: string): string {
  const wall = Date.parse(`${day}T00:00:00Z`) + minute * 60000;
  let instant = wall;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    const actual = Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:00Z`);
    const correction = wall - actual;
    if (correction === 0) return new Date(instant).toISOString();
    instant += correction;
  }
  return new Date(instant).toISOString();
}
/** Minutes after local midnight, the inverse of `localInstant` for a single instant. */
export function dayMinute(instant: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  return value('hour') * 60 + value('minute');
}

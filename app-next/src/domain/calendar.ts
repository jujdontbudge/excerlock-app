import { DayKey } from './types';

export type LocalInstantResolution = { instant: string; converged: boolean };

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
  return resolveLocalInstant(day, minute, timezone).instant;
}

/**
 * Resolves a local wall-clock minute without relying on offset-guess iteration.
 * Repeated minutes choose their earliest occurrence. Nonexistent minutes retain
 * their position within the spring gap and report that they did not converge.
 */
export function resolveLocalInstant(day: DayKey, minute: number, timezone: string): LocalInstantResolution {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day)
    throw new RangeError(`Invalid local day: ${day}`);
  if (!Number.isInteger(minute) || minute < 0 || minute >= 1440)
    throw new RangeError(`Invalid local minute: ${minute}`);

  const wall = Date.parse(`${day}T00:00:00Z`) + minute * 60000;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const renderedWall = (instant: number): number => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    return Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:00Z`);
  };

  // Every current IANA offset affecting this local day is visible in this
  // window. Offset values retain sub-hour transitions such as Lord Howe's.
  const offsets = new Set<number>();
  for (let sample = wall - 36 * 3600000; sample <= wall + 36 * 3600000; sample += 6 * 3600000) {
    offsets.add(renderedWall(sample) - sample);
  }
  const candidates = [...offsets].map((offset) => wall - offset);
  const exact = candidates.filter((instant) => renderedWall(instant) === wall).sort((a, b) => a - b);
  if (exact.length) return { instant: new Date(exact[0]).toISOString(), converged: true };

  const after = candidates
    .map((instant) => ({ instant, delta: renderedWall(instant) - wall }))
    .filter(({ delta }) => delta > 0)
    .sort((a, b) => a.delta - b.delta || a.instant - b.instant)[0];
  if (!after) throw new RangeError(`Unable to resolve local instant: ${day} minute ${minute} in ${timezone}`);
  return { instant: new Date(after.instant).toISOString(), converged: false };
}

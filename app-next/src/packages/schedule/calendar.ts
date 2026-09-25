import { DayKey } from '../model/types';

export type LocalInstantResolution = { instant: string; converged: boolean };
const resolutionCache = new Map<string, LocalInstantResolution>();
function remember(key: string, result: LocalInstantResolution): LocalInstantResolution {
  if (resolutionCache.size >= 2048) resolutionCache.delete(resolutionCache.keys().next().value!);
  resolutionCache.set(key, Object.freeze({ ...result }));
  return result;
}

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

export function resolveLocalInstant(day: DayKey, minute: number, timezone: string): LocalInstantResolution {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day)
    throw new RangeError(`Invalid local day: ${day}`);
  if (!Number.isInteger(minute) || minute < 0 || minute >= 1440)
    throw new RangeError(`Invalid local minute: ${minute}`);

  const cacheKey = JSON.stringify([day, minute, timezone]);
  const cached = resolutionCache.get(cacheKey);
  if (cached) return { ...cached };
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

  const offsets = new Set<number>();
  for (let sample = wall - 36 * 3600000; sample <= wall + 36 * 3600000; sample += 6 * 3600000) {
    offsets.add(renderedWall(sample) - sample);
  }
  const candidates = [...offsets].map((offset) => wall - offset);
  const exact = candidates.filter((instant) => renderedWall(instant) === wall).sort((a, b) => a - b);
  if (exact.length) return remember(cacheKey, { instant: new Date(exact[0]).toISOString(), converged: true });

  const after = candidates
    .map((instant) => ({ instant, delta: renderedWall(instant) - wall }))
    .filter(({ delta }) => delta > 0)
    .sort((a, b) => a.delta - b.delta || a.instant - b.instant)[0];
  if (!after) throw new RangeError(`Unable to resolve local instant: ${day} minute ${minute} in ${timezone}`);
  return remember(cacheKey, { instant: new Date(after.instant).toISOString(), converged: false });
}

export function localDayStart(day: DayKey, timezone: string): string {
  const result = resolveLocalInstant(day, 0, timezone);
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !result.converged)
    throw new Error(`Nonconverged local day boundary: ${day} in ${timezone}`);
  return result.instant;
}

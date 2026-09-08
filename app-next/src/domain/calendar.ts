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
export type LocalInstant = string & { instant: string; converged: boolean };

const localInstantResult = (instant: number, converged: boolean): LocalInstant => {
  const value = { instant: new Date(instant).toISOString(), converged };
  Object.defineProperty(value, Symbol.toPrimitive, { value: () => value.instant, enumerable: false });
  return value as LocalInstant;
};

export function localInstant(day: DayKey, minute: number, timezone: string): LocalInstant {
  const wall = Date.parse(`${day}T00:00:00Z`) + minute * 60000;
  let instant = wall;
  let previousCorrection: number | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
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
    if (correction === 0) return localInstantResult(instant, true);
    const next = instant + correction;
    if (previousCorrection !== null && Math.sign(previousCorrection) !== Math.sign(correction)) {
      if (Math.abs(correction) > 2 * 60 * 60_000) throw new Error('LOCAL_INSTANT_DID_NOT_CONVERGE');
      return localInstantResult(actual > wall ? instant : next, false);
    }
    previousCorrection = correction;
    instant = next;
  }
  throw new Error('LOCAL_INSTANT_DID_NOT_CONVERGE');
}

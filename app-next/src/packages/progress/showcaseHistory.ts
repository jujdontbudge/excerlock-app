import type { HistoryDay } from '../model/models';
import type { DayKey } from '../model/types';
import { addDays } from '../schedule/calendar';

export const SHOWCASE_DAYS = 61;
const SHOWCASE_STEPS = { min: 13_000, max: 22_000 } as const;
const SHOWCASE_GYM_MINUTES = { min: 60, max: 120 } as const;

function dayFraction(day: DayKey, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (const character of day) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10_000) / 10_000;
}

const between = (range: { min: number; max: number }, fraction: number) =>
  Math.round(range.min + (range.max - range.min) * fraction);

export function showcaseHistory(today: DayKey): HistoryDay[] {
  return Array.from({ length: SHOWCASE_DAYS }, (_, index) => {
    const daysAgo = SHOWCASE_DAYS - 1 - index,
      day = addDays(today, -daysAgo);
    return {
      day,
      usageMinutes: Math.round(60 + daysAgo * 1.5 + dayFraction(day, 3) * 20),
      activity: { walking: between(SHOWCASE_STEPS, dayFraction(day, 1)), gym: between(SHOWCASE_GYM_MINUTES, dayFraction(day, 2)) },
      met: true,
      scheduled: true,
    };
  });
}

export function showcaseStepMetrics(steps: number) {
  return {
    distanceMeters: steps * 0.76,
    floorsAscended: Math.floor(steps / 3000),
    activeMinutes: Math.round(steps / 100),
  };
}

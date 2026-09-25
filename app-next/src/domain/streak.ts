import { DayKey, Rule, RuleDay } from './types';
export const WALKING_STREAK_MINUTES = 10;
export type StreakDay = { day: DayKey; scheduled: boolean; met: boolean };
export function isMetDay(rules: Rule[], rows: RuleDay[], walkingMinutes: number): boolean {
  const enabled = rules.filter((r) => r.enabled);
  return (
    enabled.some((r) => rows.some((d) => d.ruleId === r.id && d.met)) ||
    (enabled.length > 0 && enabled.every((r) => r.mode.kind === 'state') && walkingMinutes >= WALKING_STREAK_MINUTES)
  );
}
export function streak(days: StreakDay[], today: DayKey): { current: number; longest: number } {
  let current = 0,
    longest = 0;
  for (const row of [...days].filter((d) => d.day <= today && d.scheduled).sort((a, b) => a.day.localeCompare(b.day))) {
    if (row.met) {
      current++;
      longest = Math.max(longest, current);
    } else if (row.day !== today) current = 0;
  }
  return { current, longest };
}

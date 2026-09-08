import { HistoryDay } from '../ports/models';
import { addDays, dayKey } from './calendar';
import { isMetDay } from './streak';
import { DayKey, Rule, RuleDay } from './types';
import { windowInstances } from './schedule';

const MAX_SEALED_DAYS = 400;
const RULE_DAY_RETENTION_DAYS = 35;

type SealDaysInput = {
  history: HistoryDay[];
  rules: Rule[];
  ruleDays: RuleDay[];
  lastSealedDay: DayKey | null;
  today: DayKey;
  timezone: string;
  sealedAt: string;
};

const emptyHistoryDay = (day: DayKey): HistoryDay => ({
  day,
  usageMinutes: null,
  activity: { walking: 0, gym: 0, running: 0, biking: 0 },
  met: false,
  scheduled: false,
});

export function sealDays(input: SealDaysInput): HistoryDay[] {
  const earliest = addDays(input.today, -MAX_SEALED_DAYS);
  const knownDays = [
    ...input.history.map((row) => row.day),
    ...input.ruleDays.map((row) => row.day),
    ...input.rules.map((rule) => dayKey(rule.createdAt, input.timezone)),
  ].sort();
  let day = input.lastSealedDay
    ? addDays(input.lastSealedDay, 1)
    : (knownDays[0] ?? addDays(input.today, -1));
  if (day < earliest) day = earliest;
  const yesterday = addDays(input.today, -1);
  const rows = new Map(input.history.map((row) => [row.day, row]));

  while (day <= yesterday) {
    const existing = rows.get(day);
    if (!existing?.sealedAt) {
      const scheduledRules = input.rules.filter((rule) => windowInstances(rule, day, input.timezone).length > 0);
      const ruleDays = input.ruleDays.filter((row) => row.day === day);
      const walkingMinutes = Math.max(
        0,
        ...ruleDays
          .filter((row) => scheduledRules.some((rule) => rule.id === row.ruleId && rule.mode.kind === 'state'))
          .map((row) => row.progress),
      );
      rows.set(day, {
        ...(existing ?? emptyHistoryDay(day)),
        scheduled: scheduledRules.length > 0,
        met: isMetDay(scheduledRules, ruleDays, walkingMinutes),
        sealedAt: input.sealedAt,
      });
    }
    day = addDays(day, 1);
  }
  return [...rows.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function pruneRuleDays(days: RuleDay[], today: DayKey): RuleDay[] {
  const oldest = addDays(today, 1 - RULE_DAY_RETENTION_DAYS);
  return days.filter((row) => row.day >= oldest && row.day <= today);
}

export function pruneEarnedUnlocks<T extends { day: DayKey }>(rows: T[], today: DayKey): T[] {
  const yesterday = addDays(today, -1);
  return rows.filter((row) => row.day === yesterday || row.day === today);
}

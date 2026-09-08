import { useMemo } from 'react';
import { Activity, Rule, RuleDay } from '../../domain/types';
import { isMetDay } from '../../domain/streak';
import { HistoryDay } from '../../ports/models';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';

type StoredHistoryFields = Partial<Pick<HistoryDay, 'usageMinutes' | 'activity' | 'scheduled'>>;
type StoredRuleDay = RuleDay & StoredHistoryFields;

const activities: Activity[] = ['walking', 'gym', 'running', 'biking'];
const emptyActivity = (): Record<Activity, number> => ({ walking: 0, gym: 0, running: 0, biking: 0 });

function fallbackActivity(rows: RuleDay[], rules: Rule[]): Record<Activity, number> {
  const result = emptyActivity();
  for (const row of rows) {
    const rule = rules.find((candidate) => candidate.id === row.ruleId);
    if (rule) result[rule.activity] = Math.max(result[rule.activity], row.progress);
  }
  return result;
}

export function historyFromRuleDays(rows: RuleDay[], rules: Rule[]): HistoryDay[] {
  const byDay = new Map<string, RuleDay[]>();
  for (const row of rows) byDay.set(row.day, [...(byDay.get(row.day) ?? []), row]);

  return [...byDay.entries()]
    .map(([day, dayRows]) => {
      const storedRows = dayRows as StoredRuleDay[];
      const storedActivity = storedRows.filter((row) => row.activity !== undefined);
      const activity = storedActivity.length
        ? activities.reduce((result, key) => {
            result[key] = Math.max(0, ...storedActivity.map((row) => row.activity?.[key] ?? 0));
            return result;
          }, emptyActivity())
        : fallbackActivity(dayRows, rules);
      const measurement = storedRows.find((row) => typeof row.usageMinutes === 'number')?.usageMinutes ?? null;
      const isSealedHistory = storedRows.some((row) => row.scheduled !== undefined);
      const walkingMinutes = Math.max(
        0,
        ...dayRows
          .filter((row) => rules.some((rule) => rule.id === row.ruleId && rule.activity === 'walking'))
          .map((row) => row.progress),
      );

      return {
        day,
        usageMinutes: measurement,
        activity,
        scheduled: storedRows.some((row) => row.scheduled ?? true),
        met: isSealedHistory ? dayRows.some((row) => row.met) : isMetDay(rules, dayRows, walkingMinutes),
      };
    })
    .sort((left, right) => left.day.localeCompare(right.day));
}

// merge: replace with P2-T15 historyStore once its persisted HistoryDay selector lands.
export function useAnalyticsHistory(): HistoryDay[] {
  const rows = useRuleDaysStore((state) => state.data.days);
  const rules = useRulesStore((state) => state.data.rules);
  return useMemo(() => historyFromRuleDays(rows, rules), [rows, rules]);
}

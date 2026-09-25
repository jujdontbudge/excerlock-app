import { HistoryDay } from '../../model/models';
import { Rule, RuleDay } from '../../model/types';
import { reclaimedPeriod } from '../../progress/reclaimed';
import { streak } from '../../progress/streak';
import { addDays } from '../../schedule/calendar';
import { periodBounds, dates, Period, weekStart } from './period';
import { analyticsCopy as c } from './analyticsCopy';
export type AnalyticsInputs = { rules?: Rule[]; ruleDays?: RuleDay[] };
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
export function analyticsModel(
  history: HistoryDay[],
  today: string,
  period: Period,
  offset: number,
  baseline: number,
  { rules = [], ruleDays = [] }: AnalyticsInputs = {},
) {
  const firstDay = history.reduce((min, d) => (d.day < min ? d.day : min), today),
    { start, end } = periodBounds(today, period, offset, firstDay),
    prev = periodBounds(today, period, offset - 1, firstDay),
    inRange = (day: string) => day >= start && day <= end && day <= today,
    rows = history.filter((d) => inRange(d.day)),
    previousRows = prev ? history.filter((d) => d.day >= prev.start && d.day <= prev.end && d.day <= today) : [],
    reclaimed = reclaimedPeriod(
      baseline,
      rows.map((d) => d.usageMinutes),
    ),
    previous = reclaimedPeriod(
      baseline,
      previousRows.map((d) => d.usageMinutes),
    ),
    allDays = dates(start, end),
    eligible = allDays.filter((d) => d <= today);
  const groupDays = period === 'Day' ? dates(weekStart(start), addDays(weekStart(start), 6)) : allDays;
  const groups: string[][] = groupDays.map((d) => [d]);
  const series = groups.map((days) => {
    const bucket = history.filter((r) => days.includes(r.day) && r.day <= today),
      values = bucket.flatMap((r) => (r.usageMinutes === null ? [] : [r.usageMinutes]));
    return {
      day: days[0],
      days: days.length,
      label: c.point(days[0], period),
      value: values.length ? sum(values) / values.length : null,
      reclaimed: values.length ? reclaimedPeriod(baseline, values).minutes / values.length : null,
      met: bucket.some((r) => r.met),
      scheduled: bucket.some((r) => r.scheduled),
      activity: { walking: sum(bucket.map((r) => r.activity.walking)), gym: sum(bucket.map((r) => r.activity.gym)) },
    };
  });
  const enabled = rules.filter((r) => r.enabled),
    arrivalRules = enabled.filter((r) => r.mode.kind === 'event'),
    stateRules = enabled.filter((r) => r.mode.kind === 'state'),
    periodRuleDays = ruleDays.filter((d) => inRange(d.day));
  return {
    start,
    end,
    rows,
    series,
    elapsedDays: eligible.length,
    reclaimed,
    previous,
    delta: reclaimed.minutes - previous.minutes,
    scheduled: rows.filter((r) => r.scheduled).length,
    met: rows.filter((r) => r.scheduled && r.met).length,
    streak: streak(history, today),
    activities: {
      walking: sum(rows.map((r) => r.activity.walking)),
      gym: sum(rows.map((r) => r.activity.gym)),
    },
    arrivals: periodRuleDays.filter((d) => d.met && arrivalRules.some((r) => r.id === d.ruleId)).length,
    walkingMinutes: sum(periodRuleDays.filter((d) => stateRules.some((r) => r.id === d.ruleId)).map((d) => d.progress)),
    conditions: {
      gymMinutes: enabled.some((r) => r.activity === 'gym' && r.mode.kind === 'target'),
      gymArrival: arrivalRules.length > 0,
      steps: enabled.some((r) => r.activity === 'walking' && r.mode.kind === 'target'),
      walking: stateRules.length > 0,
    },
    dayZero: history.every((r) => r.day >= today),
  };
}
export type AnalyticsModel = ReturnType<typeof analyticsModel>;

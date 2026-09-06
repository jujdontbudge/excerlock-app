import { HistoryDay } from '../../ports/models';
import { reclaimedPeriod } from '../../domain/reclaimed';
import { streak } from '../../domain/streak';
import { periodBounds, dates, Period } from './period';
import { analyticsCopy as c } from '../../content/analytics';
export function analyticsModel(history: HistoryDay[], today: string, period: Period, offset: number, baseline: number) {
  const { start, end } = periodBounds(today, period, offset),
    prev = periodBounds(today, period, offset - 1),
    rows = history.filter((d) => d.day >= start && d.day <= end && d.day <= today),
    previousRows = history.filter((d) => d.day >= prev.start && d.day <= prev.end && d.day <= today),
    reclaimed = reclaimedPeriod(
      baseline,
      rows.map((d) => d.usageMinutes),
    ),
    previous = reclaimedPeriod(
      baseline,
      previousRows.map((d) => d.usageMinutes),
    ),
    allDays = dates(start, end),
    eligible = allDays.filter((d) => d <= today),
    groups =
      period === 'Week'
        ? allDays.map((d) => [d])
        : period === 'Month'
          ? Array.from({ length: Math.ceil(allDays.length / 7) }, (_, i) => allDays.slice(i * 7, i * 7 + 7))
          : Array.from({ length: 12 }, (_, i) => allDays.filter((d) => Number(d.slice(5, 7)) === i + 1));
  const series = groups.map((days) => {
    const bucket = rows.filter((r) => days.includes(r.day)),
      values = bucket.flatMap((r) => (r.usageMinutes === null ? [] : [r.usageMinutes]));
    return {
      label: c.point(days[0], period),
      value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      activity: {
        walking: bucket.reduce((s, r) => s + r.activity.walking, 0),
        gym: bucket.reduce((s, r) => s + r.activity.gym, 0),
        running: bucket.reduce((s, r) => s + r.activity.running, 0),
        biking: bucket.reduce((s, r) => s + r.activity.biking, 0),
      },
    };
  });
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
      walking: rows.reduce((s, r) => s + r.activity.walking, 0),
      gym: rows.reduce((s, r) => s + r.activity.gym, 0),
      running: rows.reduce((s, r) => s + r.activity.running, 0),
      biking: rows.reduce((s, r) => s + r.activity.biking, 0),
    },
    dayZero: history.every((r) => r.day >= today),
  };
}

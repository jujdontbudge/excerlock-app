import type { HistoryDay } from '../../model/models';
import { addDays } from '../../schedule/calendar';
import { dates, Period, periodBounds, weekStart } from './period';

export type TrendPoint = {
  label: string;
  axis: string | null;
  spoken: string;
  value: number;
  offset: number;
  disabled?: boolean;
};

export const TREND_POINTS = { Week: 8, Month: 12 } as const;

export function trendPoints(
  period: Period,
  today: string,
  history: readonly HistoryDay[],
  activity: 'walking' | 'gym',
  selectedOffset: number,
): TrendPoint[] {
  if (period === 'Day') {
    const start = weekStart(addDays(today, selectedOffset));
    return dates(start, addDays(start, 6)).map((day) => ({
      label: weekday(day),
      axis: weekday(day),
      spoken: format(day, { weekday: 'long', month: 'long', day: 'numeric' }),
      value: valueForDays(history, activity, day, day),
      offset: dayDifference(today, day),
      disabled: day > today,
    }));
  }
  const count = TREND_POINTS[period];
  const last = 0 - count * Math.floor(-selectedOffset / count);
  return Array.from({ length: count }, (_, index) => {
    const offset = last - (count - 1 - index);
    const bounds = periodBounds(today, period, offset);
    const value = valueForDays(history, activity, bounds.start, bounds.end);
    if (period === 'Week') {
      const monthStart = dates(bounds.start, bounds.end).find((day) => day.endsWith('-01'));
      const label = monthStart ? month(monthStart) : `${Number(bounds.start.slice(8))}`;
      return {
        label,
        axis: label,
        spoken: `Week of ${format(bounds.start, { month: 'long', day: 'numeric' })}`,
        value,
        offset,
      };
    }
    return {
      label: month(bounds.start),
      axis: (count - 1 - index) % 2 === 0 ? month(bounds.start) : null,
      spoken: format(bounds.start, { month: 'long', year: 'numeric' }),
      value,
      offset,
    };
  });
}

export function nearestEnabledTrendIndex(points: readonly TrendPoint[], x: number, width: number, inset: number): number {
  if (!points.length) return 0;
  const usableWidth = Math.max(1, width - inset * 2);
  const raw = Math.round(Math.max(0, Math.min(usableWidth, x - inset)) / usableWidth * (points.length - 1));
  if (!points[raw]?.disabled) return raw;
  for (let distance = 1; distance < points.length; distance += 1) {
    const left = raw - distance;
    if (left >= 0 && !points[left]?.disabled) return left;
    const right = raw + distance;
    if (right < points.length && !points[right]?.disabled) return right;
  }
  return raw;
}

function valueForDays(history: readonly HistoryDay[], activity: 'walking' | 'gym', start: string, end: string) {
  return history
    .filter((row) => row.day >= start && row.day <= end)
    .reduce((total, row) => total + row.activity[activity], 0);
}
function dayDifference(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}
function format(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
}
function weekday(day: string) {
  return format(day, { weekday: 'short' }).toUpperCase();
}
function month(day: string) {
  return format(day, { month: 'short' }).toUpperCase();
}

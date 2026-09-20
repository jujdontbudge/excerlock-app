import type { HistoryDay } from '../../ports/models';
import { addDays } from '../../domain/calendar';
import { dates, Period, periodBounds } from './period';

export type TrendPoint = { label: string; value: number; offset: number; disabled?: boolean };

export function trendPoints(
  period: Period,
  today: string,
  history: readonly HistoryDay[],
  activity: 'walking' | 'gym',
): TrendPoint[] {
  if (period === 'Day') {
    return dates(addDays(today, -6), today).map((day) => ({
      label: weekday(day),
      value: valueForDays(history, activity, day, day),
      offset: dayDifference(today, day),
    }));
  }
  const count = period === 'Week' ? 8 : 12;
  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    const bounds = periodBounds(today, period, offset);
    return {
      label: month(bounds.end),
      value: valueForDays(history, activity, bounds.start, bounds.end),
      offset,
    };
  });
}

export function nearestEnabledTrendIndex(points: readonly TrendPoint[], x: number, width: number): number {
  if (!points.length) return 0;
  const usableWidth = Math.max(1, width);
  const raw = Math.round(Math.max(0, Math.min(usableWidth, x)) / usableWidth * (points.length - 1));
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
function weekday(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}
function month(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

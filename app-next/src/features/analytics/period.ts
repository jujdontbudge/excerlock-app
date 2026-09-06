import { addDays } from '../../domain/calendar';
export type Period = 'Week' | 'Month' | 'Year';
export function periodBounds(today: string, period: Period, offset: number) {
  const d = new Date(today + 'T12:00:00Z');
  if (period === 'Week') {
    const start = addDays(today, -((d.getUTCDay() + 6) % 7) + offset * 7);
    return { start, end: addDays(start, 6) };
  }
  if (period === 'Month') {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + offset);
  } else {
    d.setUTCMonth(0, 1);
    d.setUTCFullYear(d.getUTCFullYear() + offset);
  }
  const start = d.toISOString().slice(0, 10);
  if (period === 'Month') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return { start, end: addDays(d.toISOString().slice(0, 10), -1) };
}
export function dates(start: string, end: string): string[] {
  const result = [];
  for (let d = start; d <= end; d = addDays(d, 1)) result.push(d);
  return result;
}

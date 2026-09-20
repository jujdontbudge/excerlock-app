import { addDays } from '../../domain/calendar';
export type Period = 'Day' | 'Week' | 'Month';
/** Monday-start calendar week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(day + 'T12:00:00Z');
  return addDays(day, -((d.getUTCDay() + 6) % 7));
}
function monthBounds(today: string, offset: number) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const start = date.toISOString().slice(0, 10);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return { start, end: addDays(date.toISOString().slice(0, 10), -1) };
}
export function periodBounds(today: string, period: Period, offset: number, _firstDay = today) {
  if (period === 'Day') {
    const day = addDays(today, offset);
    return { start: day, end: day };
  }
  if (period === 'Week') {
    const start = addDays(weekStart(today), offset * 7);
    return { start, end: addDays(start, 6) };
  }
  return monthBounds(today, offset);
}
export function dates(start: string, end: string): string[] {
  const result = [];
  for (let d = start; d <= end; d = addDays(d, 1)) result.push(d);
  return result;
}

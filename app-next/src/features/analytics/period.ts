import { addDays } from '../../domain/calendar';
export type Period = 'Day' | 'Week' | 'All';
/** Monday-start calendar week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(day + 'T12:00:00Z');
  return addDays(day, -((d.getUTCDay() + 6) % 7));
}
/** `firstDay` bounds the all-time range; it is the earliest day with any history, or today. */
export function periodBounds(today: string, period: Period, offset: number, firstDay = today) {
  if (period === 'Day') {
    const day = addDays(today, offset);
    return { start: day, end: day };
  }
  if (period === 'Week') {
    const start = addDays(weekStart(today), offset * 7);
    return { start, end: addDays(start, 6) };
  }
  return { start: firstDay < today ? firstDay : today, end: today };
}
export function dates(start: string, end: string): string[] {
  const result = [];
  for (let d = start; d <= end; d = addDays(d, 1)) result.push(d);
  return result;
}

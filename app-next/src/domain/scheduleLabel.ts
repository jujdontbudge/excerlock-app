import { Schedule } from './types';
import { domainCopy as c } from '../content/domain';
export function minuteLabel(minute: number): string {
  const hour = Math.floor(minute / 60),
    minutes = minute % 60;
  return `${hour % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''}\u00a0${hour < 12 ? c.am : c.pm}`;
}
export function scheduleLabel(schedule: Schedule): string {
  const days = [...schedule.days].sort((a, b) => (a || 7) - (b || 7));
  const dayLabel =
    days.length === 7
      ? c.everyDay
      : days.join(',') === '1,2,3,4,5'
        ? c.weekdays
        : days.map((d) => c.days[d]).join(', ');
  const w = schedule.window;
  return `${dayLabel} · ${w.kind === 'allDay' ? c.allDay : `${minuteLabel(w.startMinute)}–${minuteLabel(w.endMinute)}${w.endMinute <= w.startMinute ? c.endsNextDay : ''}`}`;
}

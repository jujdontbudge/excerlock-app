import { Schedule } from './types';
import { domainCopy as c } from '../content/domain';
import { deviceLocale, weekOrder } from '../content/locale';
/** A wall-clock minute as the device shows times: "9 AM" on a 12-hour clock, "09:00" on a 24-hour one. */
export function minuteLabel(minute: number): string {
  const hour = Math.floor(minute / 60),
    minutes = minute % 60;
  if (!deviceLocale().hour12) return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return `${hour % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''}\u00a0${hour < 12 ? c.am : c.pm}`;
}
export function scheduleLabel(schedule: Schedule): string {
  const order = weekOrder();
  const days = [...schedule.days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const dayLabel =
    days.length === 7
      ? c.everyDay
      : [...days].sort().join(',') === '1,2,3,4,5'
        ? c.weekdays
        : days.map((d) => c.days[d]).join(', ');
  const w = schedule.window;
  return `${dayLabel} · ${w.kind === 'allDay' ? c.allDay : `${minuteLabel(w.startMinute)}–${minuteLabel(w.endMinute)}${w.endMinute <= w.startMinute ? c.endsNextDay : ''}`}`;
}

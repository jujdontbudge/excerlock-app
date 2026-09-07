import { Rule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { ruleName } from '../../domain/ruleName';
import { blockingScheduleCopy as c } from '../../content/blockingSchedule';
export function blockingSchedule(rule: Rule) {
  const window = rule.schedule.window;
  const start = minuteLabel(window.kind === 'allDay' ? 0 : window.startMinute);
  const end = minuteLabel(window.kind === 'allDay' ? 0 : window.endMinute);
  const overnight = window.kind === 'allDay' || window.endMinute <= window.startMinute;
  const schedule = window.kind === 'allDay' ? c.allDay : c.range(start, end);
  const condition =
    rule.mode.kind === 'event'
      ? c.arrival
      : rule.mode.kind === 'state'
        ? c.walking
        : c.until(ruleName(rule).toLowerCase());
  return {
    message: `${schedule}\n${condition}`,
    start,
    end: end + (overnight ? c.nextDay : ''),
    icon: rule.activity,
    window,
  };
}

import { Rule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { ruleName } from '../../domain/ruleName';
import { blockingScheduleCopy as c } from '../../content/blockingSchedule';
import { mergedHomeIntervals } from './mergedHomeIntervals';
export function blockingSchedule(ruleOrRules: Rule | Rule[], hintRule?: Rule) {
  const rules = Array.isArray(ruleOrRules) ? ruleOrRules : [ruleOrRules],
    rule = hintRule ?? rules[0],
    segments = mergedHomeIntervals(rules);
  const window = rule.schedule.window;
  const start = minuteLabel(window.kind === 'allDay' ? 0 : window.startMinute);
  const end = minuteLabel(window.kind === 'allDay' ? 0 : window.endMinute);
  const overnight = window.kind === 'allDay' || window.endMinute <= window.startMinute;
  const schedule = rules.some((item) => item.schedule.window.kind === 'allDay')
    ? c.allDay
    : rules.length === 1
      ? c.range(start, end + (overnight ? c.nextDay : ''))
      : c.joinedRanges(
          segments.map((segment) => {
            const overnightRule = rules.find((item) => {
              const itemWindow = item.schedule.window;
              return itemWindow.kind === 'range' && itemWindow.startMinute === segment.startMinute && itemWindow.endMinute <= itemWindow.startMinute;
            });
            const segmentEnd = overnightRule?.schedule.window;
            return c.rangePart(
              minuteLabel(segment.startMinute),
              segmentEnd?.kind === 'range'
                ? minuteLabel(segmentEnd.endMinute) + c.nextDay
                : minuteLabel(segment.endMinute === 1440 ? 0 : segment.endMinute),
            );
          }),
        );
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
    window: rules.length === 1 ? window : undefined,
    segments,
  };
}

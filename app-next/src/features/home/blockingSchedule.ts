import { DayKey, Rule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { ruleName } from '../../domain/ruleName';
import { blockingScheduleCopy as c } from '../../content/blockingSchedule';
import { dayKey, dayMinute } from '../../domain/calendar';
import { mergedLockIntervals } from '../../domain/lockIntervals';
import { TimelineInterval } from '../../design-system/BlockingTimeline';

/**
 * The day's blocking windows as the timeline draws them: the domain's merged union projected onto
 * minutes after local midnight, with an instance that crosses midnight clamped to the day's ends.
 */
export function daySegments(rules: Rule[], day: DayKey, timezone: string): TimelineInterval[] {
  return mergedLockIntervals(rules, day, 1, timezone).map(({ start, end }) => ({
    startMinute: dayKey(start, timezone) === day ? dayMinute(start, timezone) : 0,
    endMinute: dayKey(end, timezone) === day ? dayMinute(end, timezone) : 1440,
  }));
}

export function blockingSchedule(rules: Rule[], hintRule: Rule, day: DayKey, timezone: string) {
  const rule = hintRule ?? rules[0],
    segments = daySegments(rules, day, timezone);
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
              return (
                itemWindow.kind === 'range' &&
                itemWindow.startMinute === segment.startMinute &&
                itemWindow.endMinute <= itemWindow.startMinute
              );
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

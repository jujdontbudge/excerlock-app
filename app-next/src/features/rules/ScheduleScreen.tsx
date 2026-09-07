import { Heading, DayPicker, TimeRangeRow, Label } from '../../design-system';
import { View } from 'react-native';
import { RuleDraft } from './draft';
import { RulePreviewLock } from './RulePreviewLock';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
import { planCopy as c } from '../../content/plan';
import { minuteLabel, scheduleLabel } from '../../domain/scheduleLabel';
import { Weekday } from '../../domain/types';
import { ScheduleDraft, ScheduleAction, scheduleIssues, toSchedule } from './scheduleDraft';
export function ScheduleScreen({
  draft: d,
  onAction,
  onChoose,
  ruleDraft,
}: {
  draft: ScheduleDraft;
  ruleDraft?: RuleDraft;
  onAction: (a: ScheduleAction) => void;
  onChoose: (which: 'start' | 'end') => void;
}) {
  const issues = scheduleIssues(d);
  return (
    <View style={{ gap: t.space.sm }}>
      <View style={{ gap: t.space.sm }}>
        <Heading title={c.S1} />
        <Label variant="support" tone="secondary">
          {c.scheduleBody}
        </Label>

        <Reveal index={1}>
          <DayPicker days={d.days} onChange={(days) => onAction({ type: 'days', value: days as Weekday[] })} />
        </Reveal>
        {issues.includes('days') ? (
          <Reveal>
            <Label style={{ color: t.state.error }}>{c.daysError}</Label>
          </Reveal>
        ) : null}
        <Reveal index={2}>
          <TimeRangeRow
            compact
            start={minuteLabel(d.start)}
            end={minuteLabel(d.end)}
            allDay={d.allDay}
            onAllDay={(value) => onAction({ type: 'allDay', value })}
            onChoose={onChoose}
          />
        </Reveal>
        {issues.includes('window') ? (
          <Reveal>
            <Label style={{ color: t.state.error }}>{c.windowError}</Label>
          </Reveal>
        ) : null}
        <Reveal key={scheduleLabel(toSchedule(d))}>
          <Label variant="support" tone="secondary">
            {scheduleLabel(toSchedule(d))}
          </Label>
        </Reveal>
      </View>
      {ruleDraft ? <RulePreviewLock draft={ruleDraft} schedule={toSchedule(d)} /> : null}
    </View>
  );
}

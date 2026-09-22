import { Heading, DayPicker, ScheduleDial, Label } from '../../design-system';
import { View } from 'react-native';
import { RuleDraft } from './draft';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
import { planCopy as c } from '../../content/plan';
import { Weekday } from '../../domain/types';
import { ScheduleDraft, ScheduleAction, scheduleIssues } from './scheduleDraft';

export function ScheduleScreen({ draft: d, onAction, onChoose }: {
  draft: ScheduleDraft;
  ruleDraft?: RuleDraft;
  onAction: (a: ScheduleAction) => void;
  onChoose: (which: 'start' | 'end') => void;
}) {
  const issues = scheduleIssues(d);
  return (
    <View style={{ gap: t.space.lg }}>
      <Heading title={c.S1} centered />
      <Reveal index={1}>
        <DayPicker days={d.days} onChange={(days) => onAction({ type: 'days', value: days as Weekday[] })} />
      </Reveal>
      {issues.includes('days') ? <Label>{c.daysError}</Label> : null}
      <ScheduleDial
        startMinute={d.start}
        endMinute={d.end}
        allDay={d.allDay}
        onChange={(which, minute) => onAction({ type: which, value: minute })}
        onChoose={onChoose}
      />
      {issues.includes('window') ? <Label>{c.windowError}</Label> : null}
    </View>
  );
}

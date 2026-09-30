import { Heading, DayPicker } from '../ui';
import { ScheduleDial } from '../schedule/ScheduleDial';
import { View } from 'react-native';
import { RuleDraft } from './draft';
import { Reveal } from '../ui/Reveal';
import { tokens as t } from '../ui/tokens';
import { planCopy as c } from './planCopy';
import { Weekday } from '../model/types';
import { ScheduleDraft, ScheduleAction } from './scheduleDraft';

export function ScheduleScreen({ draft: d, onAction, onChoose }: {
  draft: ScheduleDraft;
  ruleDraft?: RuleDraft;
  onAction: (a: ScheduleAction) => void;
  onChoose: (which: 'start' | 'end') => void;
}) {
  return (
    <View style={{ gap: t.space.lg }}>
      <Heading title={c.S1} centered />
      <Reveal index={1}>
        <DayPicker days={d.days} onChange={(days) => onAction({ type: 'days', value: days as Weekday[] })} />
      </Reveal>
      <ScheduleDial
        startMinute={d.start}
        endMinute={d.end}
        allDay={d.allDay}
        onChange={(which, minute) => onAction({ type: which, value: minute })}
        onChoose={onChoose}
      />
    </View>
  );
}

import { View } from 'react-native';
import { Label } from '../../design-system';
import { BlockingScheduleCard } from '../../design-system/BlockingScheduleCard';
import { IconName } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { Reveal } from '../../motion/Reveal';
import { Schedule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { conditionPreviewCopy as c } from '../../content/conditionPreview';
import { rulePreviewCopy } from '../../content/rulePreview';

/** The rule so far, shown in the same card the welcome screen uses to introduce a rule. */
export function ConditionPreview({
  sentence,
  icon,
  schedule,
}: {
  sentence: string | null;
  icon: IconName;
  schedule?: Schedule;
}) {
  if (!sentence) return null;
  const range = schedule?.window.kind === 'range' ? schedule.window : undefined;
  return (
    <View style={{ gap: t.space.md }}>
      <Label variant="label" style={{ textAlign: 'center' }}>
        {c.caption}
      </Label>
      <Reveal key={sentence}>
        <View testID="condition-preview">
          <BlockingScheduleCard
            message={sentence}
            icon={icon}
            window={schedule?.window}
            start={range ? minuteLabel(range.startMinute) : schedule ? rulePreviewCopy.dayStart : rulePreviewCopy.start}
            end={range ? minuteLabel(range.endMinute) : schedule ? rulePreviewCopy.dayEnd : rulePreviewCopy.end}
          />
        </View>
      </Reveal>
    </View>
  );
}

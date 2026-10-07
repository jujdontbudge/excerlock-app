import { View } from 'react-native';
import { Label } from '../ui';
import { BlockingScheduleCard } from '../schedule/BlockingScheduleCard';
import { IconName } from '../ui/Icon';
import { tokens as t } from '../ui/tokens';
import { Reveal } from '../ui/Reveal';
import { Schedule } from '../model/types';
import { minuteLabel } from '../schedule/scheduleLabel';
import { conditionPreviewCopy as c } from './lib/conditionPreviewCopy';
import { rulePreviewCopy } from './lib/rulePreviewCopy';

export function ConditionPreview({
  sentence,
  icon,
  schedule,
  caption = true,
  onRemove,
  removeLabel,
}: {
  sentence: string | null;
  icon: IconName;
  schedule?: Schedule;
  caption?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  if (!sentence) return null;
  const range = schedule?.window.kind === 'range' ? schedule.window : undefined;
  return (
    <View style={{ gap: t.space.md }}>
      {caption ? (
        <Label variant="label" style={{ textAlign: 'center' }}>
          {c.caption}
        </Label>
      ) : null}
      <Reveal key={sentence}>
        <View testID="condition-preview">
          <BlockingScheduleCard
            message={sentence}
            icon={icon}
            window={schedule?.window}
            start={range ? minuteLabel(range.startMinute) : schedule ? rulePreviewCopy.dayStart : rulePreviewCopy.start}
            end={range ? minuteLabel(range.endMinute) : schedule ? rulePreviewCopy.dayEnd : rulePreviewCopy.end}
            onRemove={onRemove}
            removeLabel={removeLabel}
          />
        </View>
      </Reveal>
    </View>
  );
}

import { Schedule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { View } from 'react-native';
import { BlockingScheduleCard } from '../../design-system/BlockingScheduleCard';
import { Label, ProgressBar } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { rulePreviewCopy as c } from '../../content/rulePreview';
import { Reveal } from '../../motion/Reveal';
import { RuleDraft } from './draft';
import { rulePreviewModel } from './rulePreviewModel';

export function RulePreviewLock({ draft, schedule }: { draft: RuleDraft; schedule?: Schedule }) {
  const preview = rulePreviewModel(draft, schedule);
  return (
    <Reveal style={{ width: t.layout.ring * 3, alignSelf: 'center' }}>
      <BlockingScheduleCard
        message={preview.message}
        start={
          schedule?.window.kind === 'range' ? minuteLabel(schedule.window.startMinute) : schedule ? c.dayStart : c.start
        }
        end={schedule?.window.kind === 'range' ? minuteLabel(schedule.window.endMinute) : schedule ? c.dayEnd : c.end}
        window={schedule?.window}
        icon={preview.icon}
        lock>
        <View style={{ paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, gap: t.space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm }}>
            <Icon name={preview.icon} variant="utility" tint={t.text.onAccent} size={t.space.xl} />
            <Label variant="label" style={{ color: t.text.onAccent }}>
              {preview.progress}
            </Label>
          </View>
          <ProgressBar value={0} label={preview.progress} inverse />
        </View>
      </BlockingScheduleCard>
    </Reveal>
  );
}

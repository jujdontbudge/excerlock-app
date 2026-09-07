import { View } from 'react-native';
import { BlockingScheduleCard } from '../../design-system/BlockingScheduleCard';
import { Label, ProgressBar } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { rulePreviewCopy as c } from '../../content/rulePreview';
import { Reveal } from '../../motion/Reveal';
import { RuleDraft } from './draft';
import { rulePreviewModel } from './rulePreviewModel';

export function RulePreviewLock({ draft }: { draft: RuleDraft }) {
  const preview = rulePreviewModel(draft);
  return (
    <Reveal key={`${preview.message}-${preview.progress}`} style={{ width: t.layout.ring * 3, alignSelf: 'center' }}>
      <BlockingScheduleCard message={preview.message} start={c.start} end={c.end} icon={preview.icon} lock>
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

import { View } from 'react-native';
import { Heading, Label, PressableScale } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { planCopy as c } from '../../content/plan';
import { ruleName } from '../../domain/ruleName';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { Schedule } from '../../domain/types';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { RuleDraft, toRule } from './draft';
import { goalStep } from './plan';
export function PlanSummary({
  draft,
  schedule,
  onEdit,
}: {
  draft: RuleDraft;
  schedule: Schedule;
  onEdit: (step: string) => void;
}) {
  const rule = toRule(draft, schedule);
  const rows = [
    { label: c.activity, value: ruleName(rule), edit: c.editGoal, step: goalStep(draft) },
    { label: c.schedule, value: scheduleLabel(schedule), edit: c.editSchedule, step: 'S1' },
  ];
  return (
    <>
      <Heading title={c.S3} support={c.summaryBody} />
      <LivingIcon name="check" size={t.layout.ring} />
      <View style={{ gap: t.space.md }}>
        {rows.map((row, index) => (
          <Reveal
            key={row.label}
            index={index + 1}
            style={{
              padding: t.space.lg,
              borderRadius: t.radius.card,
              backgroundColor: t.surface.card,
              borderWidth: t.stroke.hairline,
              borderColor: t.border.default,
              gap: t.space.sm,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
              <View style={{ flex: 1, gap: t.space.sm }}>
                <Label variant="support" tone="secondary">
                  {row.label}
                </Label>
                <Label variant="section">{row.value}</Label>
              </View>
              <PressableScale
                label={row.edit}
                onPress={() => onEdit(row.step)}
                style={{ minWidth: t.layout.touch, alignItems: 'center' }}>
                <Label variant="support" style={{ color: t.text.primary }}>
                  {c.edit}
                </Label>
              </PressableScale>
            </View>
          </Reveal>
        ))}
      </View>
      <Reveal index={rows.length + 1}>
        <Label tone="secondary">
          {draft.activity === 'walking' && draft.walkingMode === 'state' ? c.stateSupport : c.targetSupport}
        </Label>
      </Reveal>
    </>
  );
}

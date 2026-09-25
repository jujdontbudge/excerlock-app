import { View } from 'react-native';
import { Heading, Label, PressableScale } from '../ui';
import { tokens as t } from '../ui/tokens';
import { planCopy as c } from '../conditions/planCopy';
import { ruleName } from '../conditions/ruleName';
import { scheduleLabel } from '../schedule/scheduleLabel';
import { Schedule } from '../model/types';
import { LivingIcon } from '../ui/LivingIcon';
import { Reveal } from '../ui/Reveal';
import { RuleDraft, toRule } from '../conditions/draft';
import { goalStep } from './lib/plan';
import { Answers } from '../model/answers';
import { planGoals } from './lib/planGoals';
import { ConditionPreview } from '../conditions/ConditionPreview';
import { conditionSentence } from '../conditions/conditionSentence';
import { conditionsCopy } from '../conditions/conditionsCopy';
import { Icon } from '../ui/Icon';
export function PlanSummary({
  draft,
  schedule,
  onEdit,
  answers,
  editing = false,
}: {
  draft: RuleDraft;
  answers?: Answers;
  schedule: Schedule;
  onEdit: (step: string) => void;
  editing?: boolean;
}) {
  const rule = toRule(draft, schedule);
  if (answers) {
    const goals = planGoals(answers);
    return <>
      <Heading title={c.S3} />
      <ConditionPreview icon={draft.activity} schedule={schedule} sentence={conditionSentence(answers, draft, { schedule, goalChosen: true })} />
      <View style={{ gap: t.space.md }}>
        {goals.map((goal, index) => <Reveal key={goal.id} index={index}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.lg, padding: t.space.lg,
            borderWidth: t.stroke.hairline, borderColor: t.border.outline, borderRadius: t.radius.card, backgroundColor: t.surface.card }}>
            <View testID={`plan-goal-icon-${goal.id}`}><Icon name={goal.icon} size={t.icon.md} /></View>
            <Label variant="label" style={{ flex: 1 }}>{goal.text}</Label>
          </View>
        </Reveal>)}
      </View>
    </>;
  }
  const rows = [
    { label: c.activity, value: ruleName(rule), edit: c.editGoal, step: goalStep(draft) },
    { label: c.schedule, value: scheduleLabel(schedule), edit: c.editSchedule, step: 'S1' },
  ];
  return (
    <>
      <Heading title={editing ? conditionsCopy.editTitle : c.S3} support={editing ? undefined : c.summaryBody} />
      {editing ? <Label tone="secondary" style={{ textAlign: 'center' }}>{conditionsCopy.editBody}</Label> : null}
      <LivingIcon name="check" />
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
              borderColor: t.border.outline,
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
                style={{ minWidth: t.control.inline, alignItems: 'center' }}>
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

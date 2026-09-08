import { View } from 'react-native';
import { Heading, Label, PressableScale } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { planCopy as c } from '../../content/plan';
import { activities } from '../../content/activities';
import { ruleName } from '../../domain/ruleName';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { Schedule } from '../../domain/types';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { RuleDraft, toRule } from './draft';
import { modeStep } from './plan';
import { planStart } from './planTiming';
type Row = { label: string; value: string; edit: string; onPress: () => void };
export function PlanSummary({
  draft,
  schedule,
  onEdit,
  gymCount,
  onEditGyms,
  now,
  timezone,
}: {
  draft: RuleDraft;
  schedule: Schedule;
  onEdit: (step: string) => void;
  gymCount?: number;
  onEditGyms?: () => void;
  now?: string;
  timezone?: string;
}) {
  const rule = toRule(draft, schedule);
  const activity = activities.find((a) => a.id === draft.activity)!;
  const gyms = gymCount ?? 0;
  const rows: Row[] = [
    { label: c.activity, value: activity.title, edit: c.editActivity, onPress: () => onEdit('O20') },
    { label: c.goal, value: ruleName(rule), edit: c.editGoal, onPress: () => onEdit(modeStep(draft)) },
    ...(draft.activity === 'walking'
      ? [{ label: c.place, value: c.places[draft.place], edit: c.editPlace, onPress: () => onEdit('W1') }]
      : []),
    ...(draft.activity === 'gym' && onEditGyms
      ? [
          {
            label: c.gyms,
            value: gyms ? c.savedGyms(gyms) : `${c.noGym} · ${c.addGym}`,
            edit: c.editGyms,
            onPress: onEditGyms,
          },
        ]
      : []),
    { label: c.schedule, value: scheduleLabel(schedule), edit: c.editSchedule, onPress: () => onEdit('S1') },
  ];
  const start = now ? planStart(rule, now, timezone ?? 'UTC') : null;
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
                onPress={row.onPress}
                style={{ minWidth: t.layout.touch, alignItems: 'center' }}>
                <Label variant="support" style={{ color: t.brand.primary }}>
                  {c.edit}
                </Label>
              </PressableScale>
            </View>
          </Reveal>
        ))}
      </View>
      {start ? (
        <Reveal index={rows.length + 1} style={{ gap: t.space.xs }}>
          <Label variant="label">{start.now ? c.startsNow : start.time ? c.startsAt(start.time) : c.startsNow}</Label>
          <Label variant="support" tone="secondary">
            {c.toUnlock(ruleName(rule))}
          </Label>
        </Reveal>
      ) : null}
      <Reveal index={rows.length + 2}>
        <Label tone="secondary">
          {draft.activity === 'walking' && draft.walkingMode === 'state' ? c.stateSupport : c.targetSupport}
        </Label>
      </Reveal>
    </>
  );
}

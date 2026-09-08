import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { NumberField, Label, PressableScale } from '../../design-system';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
import { workoutCopy as c } from '../../content/workoutRules';
import { walkingCopy } from '../../content/rules';
import { RuleDraft, DraftAction } from './draft';
import { goalRange, validGoal } from './goalRange';
import { validWalkingMinutes } from '../../domain/walkingDuration';
export function WorkoutGoalScreen({
  step,
  draft: d,
  onAction,
}: {
  step: 'W4' | 'G2' | 'R2' | 'B2' | 'D';
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const distance = step === 'D',
    activity = d.activity,
    value = distance ? d.distance : activity === 'walking' ? d.walkMinutes : activity === 'gym' ? d.gymMinutes : d.minutes,
    range = goalRange(d, distance),
    unit = distance ? d.unit : c.minutes;
  const change = (value: number) =>
    onAction(
      distance
        ? { type: 'setDistance', value, unit: d.unit }
        : { type: activity === 'walking' ? 'setWalkMinutes' : activity === 'gym' ? 'setGymMinutes' : 'setMinutes', value },
    );
  const hint = c.range(...range, unit),
    valid = activity === 'walking' ? validWalkingMinutes(value) : validGoal(value, range);
  return (
    <>
      <Reveal index={1} style={{ gap: t.space.lg }}>
        <NumberField
          label={distance ? c.distance : c.goal}
          min={range[0]}
          max={range[1]}
          step={distance ? range[0] : 5}
          value={Number.isNaN(value) ? '' : String(value)}
          unit={unit}
          units={distance ? ['mi', 'km'] : undefined}
          onUnitChange={(unit) => onAction({ type: 'setDistance', value, unit: unit as 'mi' | 'km' })}
          onChange={(text) => change(text.trim() ? Number(text.replace(',', '.')) : NaN)}
          error={valid ? undefined : hint}
        />
        {!distance ? (
          <View style={{ flexDirection: 'row', gap: t.space.md }}>
            {c.presets[activity].map((preset) => (
              <PressableScale key={preset} label={c.preset(preset)} onPress={() => change(preset)} style={{ flex: 1 }}>
                <Animated.View
                  style={{
                    padding: t.space.md,
                    minHeight: t.layout.touch,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: t.radius.field,
                    backgroundColor: value === preset ? t.surface.selected : t.surface.subtle,
                    transitionProperty: 'backgroundColor',
                    transitionDuration: t.motion.duration.fast,
                  }}>
                  <Label variant="label">{preset}</Label>
                </Animated.View>
              </PressableScale>
            ))}
          </View>
        ) : null}
        {valid ? (
          <Reveal key={hint}>
            <Label tone="secondary">{hint}</Label>
          </Reveal>
        ) : null}
        {activity === 'walking' && d.place === 'treadmill' && value > 15 ? (
          <Label tone="secondary">{walkingCopy.scanAgain}</Label>
        ) : null}
      </Reveal>
    </>
  );
}

import { View } from 'react-native';
import { Heading, ChoiceRow, NumberField } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { walkingCopy as c } from '../../content/rules';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { RuleDraft, DraftAction } from './draft';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { useOptionalRuntime } from '../../runtime/AppRuntimeProvider';
import {
  isValidStepGoal,
  MAX_STEP_GOAL,
  MIN_STANDARD_STEP_GOAL,
  REVIEW_STEP_GOAL,
  STEP_GOAL_INCREMENT,
} from '../../domain/stepGoal';
export function WalkingScreen({
  step,
  draft: d,
  onAction,
  contentOnly = false,
}: {
  step: 'W1' | 'W2' | 'W3';
  contentOnly?: boolean;
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const walkPlaces = useProfileStore((s) => s.data.walkPlaces);
  const runtime = useOptionalRuntime();
  const minutes = d.walkingMode === 'minutes';
  const value = minutes ? d.walkMinutes : d.stepGoal;
  const valid = Number.isFinite(value) && (minutes
    ? Number.isInteger(value) && value >= 5 && value <= 180
    : isValidStepGoal(value));
  const change = (next: number) => onAction({ type: minutes ? 'setWalkMinutes' : 'setStepGoal', value: next });
  return (
    <>
      {!contentOnly ? (
        <>
          <Heading title={c[step].title} centered={step !== 'W3'} />
          <LivingIcon
            name={step === 'W2' && d.walkingMode === 'state' ? 'lock-open' : 'walking'}
            size={t.layout.ring}
          />
        </>
      ) : null}
      {step === 'W1'
        ? c.places.map((p, index) => {
            const both = p.id === 'both';
            const selected = both
              ? walkPlaces.includes('outside') && walkPlaces.includes('treadmill')
              : walkPlaces.includes(p.id as 'outside' | 'treadmill');
            return (
              <Reveal key={p.id} index={index + 1}>
                <ChoiceRow
                  title={p.title}
                  multiple
                  selected={selected}
                  compact
                  onPress={() => {
                    // "Both" is the pair; picking a single place narrows back to it.
                    const next: ('outside' | 'treadmill')[] = both
                      ? ['outside', 'treadmill']
                      : [p.id as 'outside' | 'treadmill'];
                    if (next.length === 0) return;
                    useProfileStore.getState().patch({ walkPlaces: next });
                    runtime?.analytics.track('walk_places_updated', { walk_places: next });
                  }}
                />
              </Reveal>
            );
          })
        : null}
      {step === 'W2'
        ? c.modes.map((m, index) => (
            <Reveal key={m.id} index={index + 1}>
              <ChoiceRow
                title={m.title}

                selected={d.walkingMode === m.id}
                compact
                onPress={() => onAction({ type: 'setWalkingMode', value: m.id })}
              />
            </Reveal>
          ))
        : null}
      {step === 'W3' ? (
        <Reveal index={1} style={{ gap: t.space.lg }}>
          <NumberField
            centered
            label={minutes ? c.minutesGoal : c.goal}
            step={minutes ? 5 : STEP_GOAL_INCREMENT}
            min={minutes ? 5 : REVIEW_STEP_GOAL}
            max={minutes ? 180 : MAX_STEP_GOAL}
            value={Number.isNaN(value) ? '' : String(value)}
            unit={minutes ? c.minutesUnit : c.unit}
            onChange={(text) => change(text.trim() ? Number(text) : NaN)}
            adjustValue={minutes ? undefined : (current, direction) => {
              if (direction === 'increment' && current === REVIEW_STEP_GOAL) return MIN_STANDARD_STEP_GOAL;
              if (direction === 'decrement' && current <= MIN_STANDARD_STEP_GOAL) return current;
              return current + (direction === 'increment' ? STEP_GOAL_INCREMENT : -STEP_GOAL_INCREMENT);
            }}
            error={valid ? undefined : minutes ? c.minutesRange : c.range}
          />
        </Reveal>
      ) : null}
    </>
  );
}

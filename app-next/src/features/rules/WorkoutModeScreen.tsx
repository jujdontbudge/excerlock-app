import { ChoiceRow, Label } from '../../design-system';
import { Reveal } from '../../motion/Reveal';
import { workoutCopy as c } from '../../content/workoutRules';
import { RuleDraft, DraftAction } from './draft';
export function WorkoutModeScreen({
  draft: d,
  onAction,
}: {
  step: 'G1' | 'R1' | 'B1';
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const activity = d.activity === 'walking' ? 'running' : d.activity,
    selected = activity === 'gym' ? d.gymMode : d.runMode;
  return (
    <>
      {c.modes[activity].map((mode, index) => (
        <Reveal key={mode.id} index={index + 1}>
          <ChoiceRow
            title={mode.title}
            recommended={index === 0}
            selected={selected === mode.id}
            compact
            onPress={() =>
              onAction(
                activity === 'gym'
                  ? { type: 'setGymMode', value: mode.id as 'time' | 'arrival' }
                  : { type: 'setRunMode', value: mode.id as 'minutes' | 'distance' },
              )
            }
          />
        </Reveal>
      ))}
      <Reveal>
        <Label tone="secondary">{c.support}</Label>
      </Reveal>
    </>
  );
}

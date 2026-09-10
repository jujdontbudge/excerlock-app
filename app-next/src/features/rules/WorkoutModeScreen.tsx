import { View } from 'react-native';
import { ChoiceRow } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { Reveal } from '../../motion/Reveal';
import { workoutCopy as c } from '../../content/workoutRules';
import { RuleDraft, DraftAction } from './draft';
export function WorkoutModeScreen({
  draft: d,
  onAction,
}: {
  step: 'G1';
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  return (
    <View style={{ gap: t.space.md }}>
      {c.modes.gym.map((mode, index) => (
        <Reveal key={mode.id} index={index + 1}>
          <ChoiceRow
            title={mode.title}
            selected={d.gymMode === mode.id}
            compact
            onPress={() => onAction({ type: 'setGymMode', value: mode.id as 'time' | 'arrival' })}
          />
        </Reveal>
      ))}
    </View>
  );
}

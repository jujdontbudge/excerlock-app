import { View } from 'react-native';
import { ChoiceRow } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { Reveal } from '../../ui/Reveal';
import { workoutCopy as c } from './workoutRulesCopy';
import { RuleDraft, DraftAction } from '../draft';
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
            emphasis="solid"
            title={mode.title}
            support={'support' in mode ? mode.support : undefined}
            selected={d.gymMode === mode.id}
            compact
            onPress={() => onAction({ type: 'setGymMode', value: mode.id })}
          />
        </Reveal>
      ))}
    </View>
  );
}

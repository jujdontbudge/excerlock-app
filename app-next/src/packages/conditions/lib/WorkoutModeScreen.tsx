import { View } from 'react-native';
import { ChoiceRow } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { Reveal } from '../../ui/Reveal';
import { workoutCopy as c } from './workoutRulesCopy';
import { RuleDraft, DraftAction } from '../draft';
import { useOptionalRuntime } from '../../ports/useRuntime';
export function WorkoutModeScreen({
  draft: d,
  onAction,
}: {
  step: 'G1';
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const runtime = useOptionalRuntime();
  return (
    <View style={{ gap: t.space.md }}>
      {c.modes.gym.filter((mode) => mode.id !== 'bank' || runtime?.bankDrain.available).map((mode, index) => (
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

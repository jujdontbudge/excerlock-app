import { WalkingScreen } from './WalkingScreen';
import { WorkoutModeScreen } from './WorkoutModeScreen';
import { WorkoutGoalScreen } from './WorkoutGoalScreen';
import { RuleDraft, DraftAction } from './draft';
import { Heading } from '../../design-system';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
import { walkingCopy } from '../../content/rules';
import { workoutCopy } from '../../content/workoutRules';
import { View } from 'react-native';
import { RulePreviewLock } from './RulePreviewLock';
export type BranchStep = 'W1' | 'W2' | 'W3' | 'W4' | 'G1' | 'G2' | 'R1' | 'R2' | 'B1' | 'B2' | 'D';
export function RuleScreen({
  step,
  ...props
}: {
  step: BranchStep;
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const walking = step === 'W1' || step === 'W2' || step === 'W3' || step === 'W4';
  const copy = walking ? walkingCopy[step] : workoutCopy[step];
  const body = walking ? (
    step === 'W4' ? <WorkoutGoalScreen step={step} {...props} /> : <WalkingScreen contentOnly step={step} {...props} />
  ) : step === 'G1' || step === 'R1' || step === 'B1' ? (
    <WorkoutModeScreen step={step} {...props} />
  ) : (
    <WorkoutGoalScreen step={step} {...props} />
  );
  return (
    <>
      <View style={{ gap: t.space.sm }}>
        <Reveal key={copy.title}>
          <Heading title={copy.title} support={copy.body} />
        </Reveal>
        <Reveal key={step} style={{ gap: t.space.sm }}>
          {body}
        </Reveal>
      </View>
      <RulePreviewLock draft={props.draft} />
    </>
  );
}

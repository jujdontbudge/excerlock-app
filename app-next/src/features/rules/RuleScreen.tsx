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
import { ReactNode } from 'react';

export type BranchStep = 'W1' | 'W2' | 'W3' | 'G1' | 'G2';
export function RuleScreen({
  step,
  preview,
  ...props
}: {
  step: BranchStep;
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
  preview?: ReactNode;
}) {
  const walking = step === 'W1' || step === 'W2' || step === 'W3';
  const copy = walking ? walkingCopy[step] : workoutCopy[step];
  const body = walking ? (
    <WalkingScreen contentOnly step={step} {...props} />
  ) : step === 'G1' ? (
    <WorkoutModeScreen step={step} {...props} />
  ) : (
    <WorkoutGoalScreen step={step} {...props} />
  );
  return (
    <>
      <View style={{ gap: t.space.md }}>
        <Reveal key={copy.title}>
          <Heading title={copy.title} />
        </Reveal>
        <Reveal key={step} style={{ gap: t.space.md }}>
          {body}
        </Reveal>
      </View>
      {preview}
    </>
  );
}

import { WalkingScreen } from './lib/WalkingScreen';
import { WorkoutModeScreen } from './lib/WorkoutModeScreen';
import { WorkoutGoalScreen } from './lib/WorkoutGoalScreen';
import { RuleDraft, DraftAction } from './draft';
import { Heading, Label } from '../ui';
import { Reveal } from '../ui/Reveal';
import { tokens as t } from '../ui/tokens';
import { walkingCopy } from './lib/rulesCopy';
import { workoutCopy } from './lib/workoutRulesCopy';
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
        <Reveal key={copy.title} style={{ gap: t.space.xs }}>
          <Heading title={copy.title} centered />
          {'hint' in copy ? (
            <Label tone="secondary" style={{ textAlign: 'center' }}>
              {copy.hint}
            </Label>
          ) : null}
        </Reveal>
        <Reveal key={step} style={{ gap: t.space.md }}>
          {body}
        </Reveal>
      </View>
      {preview}
    </>
  );
}

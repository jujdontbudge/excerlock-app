import { WalkingScreen } from './WalkingScreen';
import { WorkoutModeScreen } from './WorkoutModeScreen';
import { WorkoutGoalScreen } from './WorkoutGoalScreen';
import { RuleDraft, DraftAction } from './draft';
import { Heading } from '../../design-system';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
import { walkingCopy } from '../../content/rules';
import { workoutCopy } from '../../content/workoutRules';
export type BranchStep = 'W1' | 'W2' | 'W3' | 'G1' | 'G2' | 'R1' | 'R2' | 'B1' | 'B2' | 'D';
export function RuleScreen({
  step,
  ...props
}: {
  step: BranchStep;
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const walking = step === 'W1' || step === 'W2' || step === 'W3';
  const copy = walking ? walkingCopy[step] : workoutCopy[step];
  const body = walking ? (
    <WalkingScreen contentOnly step={step} {...props} />
  ) : step === 'G1' || step === 'R1' || step === 'B1' ? (
    <WorkoutModeScreen step={step} {...props} />
  ) : (
    <WorkoutGoalScreen step={step} {...props} />
  );
  return (
    <>
      <Reveal key={copy.title}>
        <Heading title={copy.title} support={copy.body} />
      </Reveal>
      <LivingIcon
        name={step === 'W2' && props.draft.walkingMode === 'state' ? 'lock-open' : props.draft.activity}
        size={t.layout.ring}
      />
      <Reveal key={step} style={{ gap: t.space.xl }}>
        {body}
      </Reveal>
    </>
  );
}

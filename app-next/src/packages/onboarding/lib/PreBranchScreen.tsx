import { OnboardingRuleScreen } from './OnboardingRuleScreen';
import { BranchStep } from '../../conditions/RuleScreen';
import { Label, Heading, ChoiceRow } from '../../ui';
import { activityBaseline, BaselineStep } from './activityBaselineCopy';
import { AnswerProps } from './types';
import { O01 } from './screens/O01';
import { O02 } from './screens/O02';
import { O03 } from './screens/O03';
import { O04 } from './screens/O04';
import { O05 } from './screens/O05';
import { O06 } from './screens/O06';
import { O08 } from './screens/O08';
import { O10 } from './screens/O10';
import { O11 } from './screens/O11';
import { O15 } from './screens/O15';
import { O20 } from '../O20';
import { DotGridReveal } from './scenes/DotGridReveal';
import { LoopStory } from './scenes/LoopStory';
import { ChoiceQuestion } from './scenes/ChoiceQuestion';
import { BodyTarget } from './screens/BodyTarget';
const screens = { O01, O02, O03, O04, O05, O06, O08, O10, O11, O15, O20 };
export function PreBranchScreen({ step, ...props }: AnswerProps & { step: string; back?: () => void }) {
  if (['O07', 'O22'].includes(step)) return <ChoiceQuestion step={step} {...props} />;
  if (step === 'O23' || step === 'O24') return <BodyTarget step={step} {...props} />;
  if (step in activityBaseline) {
    const question = activityBaseline[step as BaselineStep];
    return (
      <>
        <Heading title={question.title} centered />
        {question.options.map((option) => (
          <ChoiceRow
            emphasis="solid"
            key={option.value}
            title={option.label}
            selected={props.answers[question.key] === option.value}
            onPress={() => props.setAnswer(question.key, option.value)}
          />
        ))}
      </>
    );
  }
  if (step === 'O02') return <O02 />;
  if (step === 'O03') return <O03 />;
  if (step === 'O12' || step === 'O13' || step === 'O14') return <DotGridReveal step={step} {...props} />;
  if (step === 'O16' || step === 'O17' || step === 'O18') return <LoopStory step={step} />;
  if (['W1', 'W2', 'W3', 'G1', 'G2', 'R1', 'R2', 'B1', 'B2', 'D'].includes(step))
    return <OnboardingRuleScreen step={step as BranchStep} {...props} />;
  const Screen = screens[step as keyof typeof screens];
  return Screen ? <Screen {...props} /> : <Label>{step}</Label>;
}

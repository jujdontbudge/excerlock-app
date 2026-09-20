import { OnboardingRuleScreen } from '../rules/OnboardingRuleScreen';
import { BranchStep } from '../rules/RuleScreen';
import { Label, Heading, ChoiceRow } from '../../design-system';
import { activityBaseline, BaselineStep } from '../../content/activityBaseline';
import { AnswerProps } from './types';
import { O01 } from './screens/O01';
import { O02 } from './screens/O02';
import { O03 } from './screens/O03';
import { O04 } from './screens/O04';
import { O05 } from './screens/O05';
import { O06 } from './screens/O06';
import { O08 } from './screens/O08';
import { O09 } from './screens/O09';
import { O10 } from './screens/O10';
import { O11 } from './screens/O11';
import { O15 } from './screens/O15';
import { O20 } from './screens/O20';
import { DotGridReveal } from './scenes/DotGridReveal';
import { LoopStory } from './scenes/LoopStory';
const screens = { O01, O02, O03, O04, O05, O06, O08, O09, O10, O11, O15, O20 };
export function PreBranchScreen({ step, back, ...props }: AnswerProps & { step: string; back?: () => void }) {
  if (step in activityBaseline) {
    const question = activityBaseline[step as BaselineStep];
    return <>
      <Heading title={question.title} />
      {question.options.map((option) => <ChoiceRow key={option.value} title={option.label}
        selected={props.answers[question.key] === option.value}
        onPress={() => props.setAnswer(question.key, option.value)} />)}
    </>;
  }
  if (step === 'O02') return <O02 onBack={back} />;
  if (step === 'O03') return <O03 onBack={back} />;
  if (step === 'O12' || step === 'O13' || step === 'O14') return <DotGridReveal step={step} {...props} />;
  if (step === 'O16' || step === 'O17' || step === 'O18') return <LoopStory step={step} />;
  if (['W1', 'W2', 'W3', 'G1', 'G2', 'R1', 'R2', 'B1', 'B2', 'D'].includes(step))
    return <OnboardingRuleScreen step={step as BranchStep} {...props} />;
  const Screen = screens[step as keyof typeof screens];
  return Screen ? <Screen {...props} /> : <Label>{step}</Label>;
}

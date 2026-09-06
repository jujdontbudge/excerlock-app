import { OnboardingRuleScreen } from '../rules/OnboardingRuleScreen';
import { Label } from '../../design-system';
import { AnswerProps } from './types';
import { O01 } from './screens/O01';
import { O02 } from './screens/O02';
import { O03 } from './screens/O03';
import { O04 } from './screens/O04';
import { O05 } from './screens/O05';
import { O06 } from './screens/O06';
import { O07 } from './screens/O07';
import { O08 } from './screens/O08';
import { O09 } from './screens/O09';
import { O10 } from './screens/O10';
import { O11 } from './screens/O11';
import { O15 } from './screens/O15';
import { O19 } from './screens/O19';
import { O20 } from './screens/O20';
import { DotGridReveal } from './scenes/DotGridReveal';
import { LoopStory } from './scenes/LoopStory';
const screens = { O01, O02, O03, O04, O05, O06, O07, O08, O09, O10, O11, O15, O19, O20 };
export function PreBranchScreen({ step, ...props }: AnswerProps & { step: string }) {
  if (step === 'O12' || step === 'O13' || step === 'O14') return <DotGridReveal step={step} {...props} />;
  if (step === 'O16' || step === 'O17' || step === 'O18') return <LoopStory step={step} />;
  if (step === 'W1' || step === 'W2' || step === 'W3') return <OnboardingRuleScreen step={step} {...props} />;
  const Screen = screens[step as keyof typeof screens];
  return Screen ? <Screen {...props} /> : <Label>{step}</Label>;
}

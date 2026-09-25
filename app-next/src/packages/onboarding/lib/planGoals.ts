import { planCopy as c } from '../../conditions/planCopy';
import { choiceQuestions } from './onboardingChoicesCopy';
import { IconName } from '../../ui/Icon';
import { Answers } from '../../model/answers';

export type PlanGoal = { id: 'movement' | 'body' | 'screen'; text: string; icon: IconName };

export function planGoals(answers: Answers): PlanGoal[] {
  const activity = answers.activity === 'gym' ? 'gym' : 'walking';
  const body = answers.bodyGoal === 'lose' || answers.bodyGoal === 'gain' || answers.bodyGoal === 'maintain' ? answers.bodyGoal : null;
  const bodyIcon = choiceQuestions.O22.options.find((option) => option.id === body)?.icon as IconName;
  return [
    { id: 'movement', text: c.goals[activity], icon: activity },
    ...(body ? [{ id: 'body' as const, text: c.goals[body], icon: bodyIcon }] : []),
    { id: 'screen', text: c.goals.screen, icon: 'clock' },
  ];
}

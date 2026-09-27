import { planCopy as c } from '../../conditions/planCopy';
import { choiceQuestions } from './onboardingChoicesCopy';
import { IconName } from '../../ui/Icon';
import { Answers, bodyGoals } from '../../model/answers';
import { bodyTargetPounds, bodyTargets, bodyTargetStepFor } from './bodyTargetCopy';

export type PlanGoal = { id: string; text: string; icon: IconName };

export function planGoals(answers: Answers): PlanGoal[] {
  const activity = answers.activity === 'gym' ? 'gym' : 'walking';
  const body = bodyGoals(answers).map((goal) => {
    const step = bodyTargetStepFor(goal);
    return {
      id: `body-${goal}`,
      text: step ? bodyTargets[step].plan(bodyTargetPounds(answers, step)) : c.goals[goal],
      icon: choiceQuestions.O22.options.find((option) => option.id === goal)?.icon as IconName,
    };
  });
  return [
    { id: 'movement', text: c.goals[activity], icon: activity },
    ...body,
    { id: 'screen', text: c.goals.screen, icon: 'clock' },
  ];
}

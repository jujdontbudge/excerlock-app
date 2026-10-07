import { planCopy as c } from '../../conditions/planCopy';
import { choiceQuestions } from './onboardingChoicesCopy';
import { IconName } from '../../ui/Icon';
import { Answers, bodyGoals } from '../../model/answers';
import { Activity } from '../../model/types';
import { bodyTargetPounds, bodyTargets, bodyTargetStepFor } from './bodyTargetCopy';

export type PlanGoal = { id: string; text: string; icon: IconName };

export function planGoals(answers: Answers, activities: Activity[] = [answers.activity === 'gym' ? 'gym' : 'walking']): PlanGoal[] {
  const movement = [...new Set(activities)].map((activity) => ({ id: `movement-${activity}`, text: c.goals[activity], icon: activity }));
  const body = bodyGoals(answers).map((goal) => {
    const step = bodyTargetStepFor(goal);
    return {
      id: `body-${goal}`,
      text: step ? bodyTargets[step].plan(bodyTargetPounds(answers, step)) : c.goals[goal],
      icon: choiceQuestions.O22.options.find((option) => option.id === goal)?.icon as IconName,
    };
  });
  return [
    ...body,
    ...movement,
    { id: 'screen', text: c.goals.screen, icon: 'clock' },
  ];
}

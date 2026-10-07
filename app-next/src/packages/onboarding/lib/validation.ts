import { scheduleDraft, scheduleIssues } from '../../conditions/scheduleDraft';
import { Answers } from '../../model/answers';
import { choiceQuestions } from './onboardingChoicesCopy';
import { draftFromAnswers } from '../../conditions/answersDraft';
import { goalRange, validGoal } from '../../conditions/goalRange';
import { isValidStepGoal } from '../../conditions/stepGoal';
import { activityBaseline, BaselineStep } from './activityBaselineCopy';
export function canContinue(step: string, answers: Answers): boolean {
  if (step in activityBaseline) {
    const question = activityBaseline[step as BaselineStep];
    return question.options.some((option) => option.value === answers[question.key]);
  }
  if (step === 'O04')
    return typeof answers.name === 'string' && answers.name.trim().length > 0 && answers.name.trim().length <= 30;
  if (step === 'O25') return true;
  if (choiceQuestions[step]) {
    const question = choiceQuestions[step];
    const value = answers[question.key];
    if (question.multiple)
      return Array.isArray(value) && value.length > 0 && value.every((id) => question.options.some((o) => o.id === id));
    return question.options.some((o) => o.id === value);
  }
  if (step === 'O20') return ['walking', 'gym'].includes(String(answers.activity));
  if (step === 'O10') {
    const minutes = answers.estimatedDailyMinutes ?? 180;
    return typeof minutes === 'number' && minutes >= 60 && minutes <= 720 && minutes % 30 === 0;
  }
  if (step === 'S1') return scheduleIssues(scheduleDraft(answers)).length === 0;
  if (step === 'W3') {
    const minutes = answers.walkingMode === 'minutes';
    const n = Number(minutes ? answers.walkMinutes ?? 20 : answers.stepGoal ?? 10000);
    return minutes ? Number.isInteger(n) && n >= 5 && n <= 180 : isValidStepGoal(n);
  }
  if (step === 'G2') {
    const draft = draftFromAnswers(answers);
    return validGoal(draft.gymMinutes, goalRange(draft));
  }
  return true;
}

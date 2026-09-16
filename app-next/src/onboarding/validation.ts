import { scheduleDraft, scheduleIssues } from '../features/rules/scheduleDraft';
import { Answers } from './types';
import { choiceQuestions } from '../content/onboardingChoices';
import { draftFromAnswers } from '../features/rules/answersDraft';
import { goalRange, validGoal } from '../features/rules/goalRange';
import { isValidStepGoal } from '../domain/stepGoal';
export function canContinue(step: string, answers: Answers): boolean {
  if (step === 'O04')
    return typeof answers.name === 'string' && answers.name.trim().length > 0 && answers.name.trim().length <= 30;
  if (choiceQuestions[step]) {
    const question = choiceQuestions[step];
    return question.options.some((o) => o.id === answers[question.key]);
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

import { scheduleDraft, scheduleIssues } from '../features/rules/scheduleDraft';
import { Answers } from './types';
import { choiceQuestions } from '../content/onboardingChoices';
import { draftFromAnswers } from '../features/rules/answersDraft';
import { goalRange, validGoal } from '../features/rules/goalRange';
export function canContinue(step: string, answers: Answers): boolean {
  if (step === 'O04')
    return typeof answers.name === 'string' && answers.name.trim().length > 0 && answers.name.trim().length <= 30;
  if (choiceQuestions[step]) {
    const question = choiceQuestions[step];
    return question.options.some((o) => o.id === answers[question.key]);
  }
  if (step === 'O20') return ['walking', 'gym', 'running', 'biking'].includes(String(answers.activity));
  if (step === 'O10') {
    const minutes = answers.estimatedDailyMinutes ?? 180;
    return typeof minutes === 'number' && minutes >= 60 && minutes <= 720 && minutes % 30 === 0;
  }
  if (step === 'S1') return scheduleIssues(scheduleDraft(answers)).length === 0;
  if (step === 'W3') {
    const n = Number(answers.stepGoal ?? 5000);
    return n >= 500 && n <= 30000 && n % 500 === 0;
  }
  if (['G2', 'R2', 'B2', 'D'].includes(step)) {
    const draft = draftFromAnswers(answers, 'mi');
    return validGoal(
      step === 'D' ? draft.distance : step === 'G2' ? draft.gymMinutes : draft.minutes,
      goalRange(draft, step === 'D'),
    );
  }
  return true;
}

import { Answers, bodyGoals } from '../../model/answers';

export const beforeAfterCopy = {
  title: { before: 'Become the ', emphasis: 'best', after: ' version of yourself' },
  before: 'Before',
  after: 'After',
} as const;

function struggle(answers: Answers) {
  const goals = bodyGoals(answers);
  if (goals.includes('gain') && goals.includes('lose')) return 'Struggling to get in shape';
  if (goals.includes('lose')) return 'Struggling to lose weight';
  if (goals.includes('gain')) return 'Struggling to build muscle';
  return 'Struggling to hit fitness goals';
}

export function beforeAfterLines(answers: Answers) {
  return {
    before: [struggle(answers), 'Procrastinating exercise', 'High screen time', 'Worse mental health'],
    after: [
      'Addicted to exercise',
      answers.activity === 'gym' ? 'Consistent at the gym' : 'Walking every single day',
      'Screen time under control',
      'A brand new life',
    ],
  };
}

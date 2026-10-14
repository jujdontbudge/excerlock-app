import type { RuleDraft } from './draft';
export const difficultyLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
const steps = { easy: 2000, medium: 3300, hard: 6000 } as const;
const gym = { easy: '12.5', medium: '20', hard: '33⅓' } as const;
export function bankTrade(activity: RuleDraft['activity'], difficulty: RuleDraft['difficulty']): string {
  const amount =
    activity === 'walking' ? steps[difficulty].toLocaleString('en-US') + ' steps' : `${gym[difficulty]} gym minutes`;
  return `${amount} = 1 h of screen time`;
}
export const bankConditionCopy = {
  exclusive: 'A Bank Condition needs to be your only Condition.',
  nextDay: 'Difficulty changes apply from the next Day.',
  difficulty: 'Difficulty',
  remove: 'Removing this Condition deletes its Points and Bank. Your Locked apps will open.',
};

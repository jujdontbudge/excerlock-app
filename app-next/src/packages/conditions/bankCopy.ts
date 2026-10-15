import type { RuleDraft } from './draft';
type Difficulty = RuleDraft['difficulty'];
type BankActivity = RuleDraft['activity'];
export const difficultyLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
const pointsPerHour = 100;
const stepsPerPoint = { easy: 20, medium: 33, hard: 60 } as const;
const pointsPerGymMinute = { easy: 8, medium: 5, hard: 3 } as const;
const number = (value: number) => value.toLocaleString('en-US');
const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};
export function bankCost(activity: BankActivity, difficulty: Difficulty, screenMinutes: number): string {
  const points = (pointsPerHour * screenMinutes) / 60;
  return activity === 'walking'
    ? `${number(Math.ceil(points * stepsPerPoint[difficulty]))} steps`
    : `${duration(Math.ceil(points / pointsPerGymMinute[difficulty]))} at the gym`;
}
export function bankPrice(activity: BankActivity, difficulty: Difficulty): string {
  return `${bankCost(activity, difficulty, 60)} = 1 h`;
}
export function bankTrade(activity: BankActivity, difficulty: Difficulty): string {
  return `${bankPrice(activity, difficulty)} of screen time`;
}
export function bankDailyCost(activity: BankActivity, difficulty: Difficulty, screenMinutes: number): string {
  return `Your ${duration(screenMinutes)} a day costs ${bankCost(activity, difficulty, screenMinutes)}`;
}
export const bankConditionCopy = {
  exclusive: 'A Bank Condition needs to be your only Condition.',
  nextDay: 'Difficulty changes apply from the next Day.',
  difficulty: 'Difficulty',
  name: (activity: BankActivity, difficulty: Difficulty) =>
    `${activity === 'walking' ? 'Walking' : 'Gym'} · ${difficultyLabels[difficulty]}`,
  promise: (activity: BankActivity) => (activity === 'walking' ? 'Your steps buy your screen time' : 'Your gym minutes buy your screen time'),
  level: (difficulty: Difficulty) => `${difficultyLabels[difficulty]} Difficulty`,
  removeTitle: 'Delete this Condition and its Bank?',
  remove: 'Your Points and every minute left in your Bank are deleted. This cannot be undone. Your Locked apps will open.',
};

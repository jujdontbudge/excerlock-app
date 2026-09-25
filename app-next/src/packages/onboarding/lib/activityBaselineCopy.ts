export const activityBaseline = {
  W0: { key: 'currentDailySteps', title: 'How many steps do you walk per day currently?', options: [
    { value: 2500, label: '0–5,000 steps' }, { value: 7500, label: '5,000–10,000 steps' },
    { value: 12500, label: '10,000–15,000 steps' }, { value: 17500, label: '15,000–20,000 steps' },
    { value: 20000, label: '20,000+ steps' },
  ] },
  G0F: { key: 'gymSessionsPerWeek', title: 'How many times per week do you go to the gym?', options: [
    { value: 0, label: 'Not yet' }, { value: 1, label: 'Once' }, { value: 2, label: 'Twice' },
    { value: 3, label: '3 times' }, { value: 4, label: '4 times' }, { value: 5, label: '5 times or more' },
  ] },
  G0H: { key: 'gymSessionHours', title: 'How many hours per session?', options: [
    { value: 0.5, label: '30 minutes' }, { value: 0.75, label: '45 minutes' },
    { value: 1, label: '1 hour' }, { value: 1.5, label: '1½ hours' }, { value: 2, label: '2 hours or more' },
  ] },
} as const;
export type BaselineStep = keyof typeof activityBaseline;

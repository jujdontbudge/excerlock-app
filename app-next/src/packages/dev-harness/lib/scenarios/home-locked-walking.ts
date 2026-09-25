import { base, history } from './base';

const abundantSteps = [8_200, 10_400, 7_600, 12_800, 9_900, 13_600, 15_000];

export const scenario2 = base('home-locked-walking', 'Walking goal · locked', {
  history: history().map((row, index) => ({
    ...row,
    activity: { ...row.activity, walking: abundantSteps[index % abundantSteps.length] },
  })),
  steps: { today: 15_000 },
});

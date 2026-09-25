import { base, history, makeRule } from './base';
import { gymPlace } from '../places';

const abundantGymMinutes = [25, 40, 30, 55, 35, 50, 45];

export const scenario10 = base('gym-time-user', 'Gym · time goal', {
  rules: [makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 })],
  history: history().map((row, index) => ({
    ...row,
    activity: { ...row.activity, gym: abundantGymMinutes[index % abundantGymMinutes.length] },
  })),
  ruleDays: [{ ruleId: 'gym', day: '2026-09-07', progress: 45, met: true, metAt: '2026-09-07T14:45:00.000Z' }],
  gym: { places: [gymPlace], presence: 'inside' },
});

import { base } from './base';
export const scenario3 = base('home-unlocked-met', 'Goal met · apps open', {
  ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 5200, met: true, metAt: '2026-09-07T14:45:00.000Z' }],
  steps: { today: 5200 },
});

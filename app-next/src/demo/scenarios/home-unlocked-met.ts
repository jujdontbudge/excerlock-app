import { base } from './base';
import { ruleName } from '../../domain/ruleName';
import { makeRule } from './base';

const walkRule = makeRule();

export const scenario3 = base('home-unlocked-met', 'Goal met · apps open', {
  ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 5200, met: true, metAt: '2026-09-07T14:45:00.000Z' }],
  earnedUnlocks: [
    {
      day: '2026-09-07',
      ruleId: 'walk',
      ruleName: ruleName(walkRule),
      metAt: '2026-09-07T14:45:00.000Z',
      windowEnd: '2026-09-08T01:00:00.000Z',
    },
  ],
  steps: { today: 5200 },
});

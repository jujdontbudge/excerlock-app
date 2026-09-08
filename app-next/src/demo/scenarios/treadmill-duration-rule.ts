import { devCopy } from '../../content/dev';
import { base, makeRule } from './base';

export const treadmillDurationRule = base('treadmill-duration-rule', devCopy.treadmillDurationScenario, {
  rules: [
    makeRule('walk-duration', {
      kind: 'target',
      activity: 'walking',
      metric: 'minutes',
      goal: 20,
      place: 'treadmill',
    }),
  ],
  ruleDays: [
    { ruleId: 'walk-duration', day: '2026-09-07', progress: 12, met: false, metAt: null, unit: 'minutes' },
  ],
  gait: 'walking',
  walking: { script: ['verifying', 'walking', 'grace', 'ended'], stepMs: 6000 },
});

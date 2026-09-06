import { base, makeRule } from './base';
export const scenario13 = base('multi-rule-overlap', 'Overlapping conditions', {
  rules: [
    makeRule(),
    makeRule('run', { kind: 'target', activity: 'running', metric: 'minutes', goal: 20 }),
    makeRule('state', { kind: 'state', activity: 'walking', place: 'either' }),
  ],
});

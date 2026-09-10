import { base, makeRule } from './base';
export const scenario13 = base('multi-rule-overlap', 'Overlapping conditions', {
  rules: [
    makeRule(),
    makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 }),
    makeRule('state', { kind: 'state', activity: 'walking', place: 'either' }),
  ],
});

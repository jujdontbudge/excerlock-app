import { base, makeRule } from './base';

export const walkingEitherTwoPills = base('walking-either-two-pills', 'Walking · either place', {
  rules: [makeRule('state', { kind: 'state', activity: 'walking', place: 'either' })],
  ruleDays: [{ ruleId: 'state', day: '2026-09-07', progress: 0, met: false, metAt: null }],
});

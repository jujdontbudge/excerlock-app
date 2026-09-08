import { base, makeRule } from './base';

export const walkingStateOutdoor = base('walking-state-outdoor', 'Walking · outdoors with phone', {
  rules: [makeRule('state', { kind: 'state', activity: 'walking', place: 'outside' })],
  ruleDays: [{ ruleId: 'state', day: '2026-09-07', progress: 0, met: false, metAt: null }],
});

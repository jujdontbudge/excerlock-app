import { base, makeRule } from './base';
export const scenario24 = base('walk-state-ready', 'Walk & Scroll · ready', {
  rules: [makeRule('walk', { kind: 'state', activity: 'walking', place: 'either' })],
  ruleDays: [],
});

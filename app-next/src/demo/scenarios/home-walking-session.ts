import { base, makeRule, NOW } from './base';
export const scenario4 = base('home-walking-session', 'Walk & Scroll · live', {
  rules: [makeRule('walk', { kind: 'state', activity: 'walking' })],
  ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 0, met: false, metAt: null }],
  walking: { script: ['walking', 'walking', 'still', 'still'], stepMs: 6000 },
});

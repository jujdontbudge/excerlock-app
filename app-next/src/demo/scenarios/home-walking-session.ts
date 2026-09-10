import { base, makeRule, NOW } from './base';
export const scenario4 = base('home-walking-session', 'Walk & Scroll · live', {
  rules: [makeRule('walk', { kind: 'state', activity: 'walking' })],
  ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 0, met: false, metAt: null }],
  walkingSession: { ruleId: 'walk', startedAt: NOW, leaseUntil: '2026-09-07T15:15:00.000Z', phase: 'walking' },
  walking: { script: ['verifying', 'walking', 'grace', 'ended'], stepMs: 6000 },
});

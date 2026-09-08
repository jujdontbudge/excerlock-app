import { base, makeRule, NOW } from './base';
export const scenario4 = base('home-walking-session', 'Walk & Scroll · live', {
  rules: [makeRule('walk', { kind: 'state', activity: 'walking', place: 'either' })],
  ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 0, met: false, metAt: null }],
  walkingSession: {
    id: 'walk-session',
    ruleId: 'walk',
    placement: 'handheld',
    instanceDay: '2026-09-07',
    startedAt: NOW,
    verifiedAt: NOW,
    leaseUntil: '2026-09-07T15:15:00.000Z',
    creditedThrough: NOW,
    endedAt: null,
    endReason: null,
    graceUntil: null,
    phase: 'walking',
  },
  walking: { script: ['verifying', 'walking', 'grace', 'ended'], stepMs: 6000 },
});

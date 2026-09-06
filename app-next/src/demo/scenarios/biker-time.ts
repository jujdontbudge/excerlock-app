import { base, makeRule } from './base';
export const scenario12 = base('biker-time', 'Biking · time', {
  rules: [makeRule('bike', { kind: 'target', activity: 'biking', metric: 'minutes', goal: 30 })],
  ruleDays: [{ ruleId: 'bike', day: '2026-09-07', progress: 18, met: false, metAt: null }],
  health: { workoutsToday: [{ kind: 'biking', minutes: 18, km: 6.4 }] },
});

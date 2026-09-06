import { base, makeRule } from './base';
export const scenario11 = base('runner-distance', 'Running · distance', {
  rules: [makeRule('run', { kind: 'target', activity: 'running', metric: 'distance', goal: 2, unit: 'mi' })],
  ruleDays: [{ ruleId: 'run', day: '2026-09-07', progress: 1.2, met: false, metAt: null }],
  health: { workoutsToday: [{ kind: 'running', minutes: 14, km: 1.9312 }] },
});

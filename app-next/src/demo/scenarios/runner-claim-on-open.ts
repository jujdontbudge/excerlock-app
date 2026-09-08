import { base, makeRule } from './base';
/** A running goal with nothing recorded yet: the finished run only lands when the app is opened. */
export const scenario24 = base('runner-claim-on-open', 'Running · claim on open', {
  rules: [makeRule('run', { kind: 'target', activity: 'running', metric: 'distance', goal: 3, unit: 'mi' })],
  ruleDays: [{ ruleId: 'run', day: '2026-09-07', progress: 0, met: false, metAt: null }],
  health: { workoutsToday: [] },
});

import { base, makeRule } from './base';

export const manualEntryDay = base('manual-entry-day', 'Manual workout ignored', {
  rules: [makeRule('run', { kind: 'target', activity: 'running', metric: 'minutes', goal: 30 })],
  ruleDays: [],
  health: {
    workoutsToday: [
      { kind: 'running', minutes: 30, km: 5, source: 'manual' },
      { kind: 'running', minutes: 10, km: 2, source: 'device' },
    ],
  },
});

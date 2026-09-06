import { base, makeRule } from './base';
export const scenario14 = base('window-crosses-midnight', 'Overnight window', {
  rules: [
    {
      ...makeRule(),
      schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
    },
  ],
  clock: { now: '2026-09-08T05:00:00.000Z', timezone: 'America/New_York' },
});

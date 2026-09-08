import { base, makeRule } from './base';
import { Weekday } from '../../domain/types';

const morning = {
  ...makeRule(),
  schedule: { days: [1, 2, 3, 4, 5] as Weekday[], window: { kind: 'range', startMinute: 540, endMinute: 720 } as const },
};
const evening = {
  ...makeRule('run', { kind: 'target', activity: 'running', metric: 'minutes', goal: 20 }),
  schedule: { days: [1, 2, 3, 4, 5] as Weekday[], window: { kind: 'range', startMinute: 1080, endMinute: 1320 } as const },
};

export const homeMetSecondWindow = base('home-met-second-window', 'Home · met before second window', {
  clock: { now: '2026-09-07T23:00:00.000Z', timezone: 'America/New_York' },
  rules: [morning, evening],
  ruleDays: [
    { ruleId: morning.id, day: '2026-09-07', progress: 5000, met: true, metAt: '2026-09-07T15:00:00.000Z' },
    { ruleId: evening.id, day: '2026-09-07', progress: 0, met: false, metAt: null },
  ],
  steps: { today: 5000 },
});

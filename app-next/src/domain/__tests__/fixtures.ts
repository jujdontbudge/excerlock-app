import { Rule } from '../types';
export const rule: Rule = {
  id: 'walk',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } },
  enabled: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

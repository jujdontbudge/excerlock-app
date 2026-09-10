import { projectWalkingMinutes } from '../projectWalkingMinutes';
import type { Rule, RuleDay } from '../types';

const rule = (id: string, metric: 'minutes' | 'steps' = 'minutes', enabled = true): Rule => ({
  id, activity: 'walking', enabled,
  mode: { kind: 'target', activity: 'walking', metric, goal: metric === 'minutes' ? 2 : 1000 },
  schedule: { days: [4], window: { kind: 'allDay' } },
  createdAt: '2026-09-10T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z',
});

test('projects whole verified minutes only to enabled scheduled walking-minute targets', () => {
  const result = projectWalkingMinutes(
    [rule('minutes'), rule('steps', 'steps'), rule('paused', 'minutes', false)], [],
    { '2026-09-10': 125_999, '2026-09-11': 60_000 }, 'UTC', '2026-09-10T12:00:00Z',
  );
  expect(result).toEqual([{ ruleId: 'minutes', day: '2026-09-10', progress: 2, met: true, metAt: '2026-09-10T12:00:00Z' }]);
});

test('projection is monotonic and preserves the original earned stamp during replay', () => {
  const row: RuleDay = { ruleId: 'minutes', day: '2026-09-10', progress: 3, met: true, metAt: '2026-09-10T10:00:00Z' };
  expect(projectWalkingMinutes([rule('minutes')], [row], { '2026-09-10': 120_000 }, 'UTC', '2026-09-10T12:00:00Z')).toEqual([row]);
});

import { history } from '../scenarios/base';
import { analyticsModel } from '../../features/analytics/analyticsModel';
test('six-week history aggregates measured days and activity without inventing missing usage', () => {
  const rows = history().map((r, i) => (i % 5 === 0 ? { ...r, usageMinutes: null } : r));
  const m = analyticsModel(rows, '2026-09-07', 'Month', -1, 180),
    august = rows.filter((r) => r.day.startsWith('2026-08'));
  expect(m.reclaimed.measuredDays).toBe(august.filter((r) => r.usageMinutes !== null).length);
  expect(m.activities.walking).toBe(august.reduce((s, r) => s + r.activity.walking, 0));
  expect(m.reclaimed.minutes).toBe(
    august.reduce((s, r) => s + (r.usageMinutes === null ? 0 : Math.max(0, 180 - r.usageMinutes)), 0),
  );
});

import { history } from '../scenarios/base';
import { analyticsModel } from '../../features/analytics/analyticsModel';
test('six-week history aggregates measured days and activity without inventing missing usage', () => {
  const rows = history().map((r, i) => (i % 5 === 0 ? { ...r, usageMinutes: null } : r));
  const m = analyticsModel(rows, '2026-09-07', 'All', 0, 180);
  expect(m.start).toBe(rows[0].day);
  expect(m.series).toHaveLength(7);
  expect(m.reclaimed.measuredDays).toBe(rows.filter((r) => r.usageMinutes !== null).length);
  expect(m.activities.walking).toBe(rows.reduce((s, r) => s + r.activity.walking, 0));
  expect(m.reclaimed.minutes).toBe(
    rows.reduce((s, r) => s + (r.usageMinutes === null ? 0 : Math.max(0, 180 - r.usageMinutes)), 0),
  );
});

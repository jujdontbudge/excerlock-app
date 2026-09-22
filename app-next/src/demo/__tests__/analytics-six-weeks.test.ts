import { history } from '../scenarios/base';
import { analyticsModel } from '../../features/analytics/analyticsModel';
test('month analytics aggregates measured days and activity without inventing missing usage', () => {
  const rows = history().map((r, i) => (i % 5 === 0 ? { ...r, usageMinutes: null } : r));
  const monthRows = rows.filter((row) => row.day >= '2026-09-01' && row.day <= '2026-09-07');
  const m = analyticsModel(rows, '2026-09-07', 'Month', 0, 180);
  expect(m.start).toBe('2026-09-01');
  expect(m.series).toHaveLength(30);
  expect(m.reclaimed.measuredDays).toBe(monthRows.filter((r) => r.usageMinutes !== null).length);
  expect(m.activities.walking).toBe(monthRows.reduce((s, r) => s + r.activity.walking, 0));
  expect(m.reclaimed.minutes).toBe(
    monthRows.reduce((s, r) => s + (r.usageMinutes === null ? 0 : Math.max(0, 180 - r.usageMinutes)), 0),
  );
});

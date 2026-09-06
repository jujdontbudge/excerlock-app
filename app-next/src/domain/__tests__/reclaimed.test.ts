import { reclaimedDay, reclaimedPeriod } from '../reclaimed';
test('only measured days count and usage cannot produce negative reclaimed time', () => {
  expect(reclaimedDay(180, 45)).toBe(135);
  expect(reclaimedDay(180, 200)).toBe(0);
  expect(reclaimedDay(180, null)).toBeNull();
  expect(reclaimedPeriod(180, [45, null, 200, 60])).toEqual({ minutes: 255, measuredDays: 3 });
  expect(reclaimedPeriod(180, [])).toEqual({ minutes: 0, measuredDays: 0 });
});

import { applyProgress } from '../progress';
import { rule } from './fixtures';
const row = { ruleId: 'walk', day: '2026-09-07', progress: 0, met: false, metAt: null };
test('progress latches met and its original instant; state rules never become met', () => {
  const met = applyProgress(rule, row, 5000, '2026-09-07T10:00:00Z');
  expect(met).toEqual({ ...row, progress: 5000, met: true, metAt: '2026-09-07T10:00:00Z' });
  expect(applyProgress(rule, met, 2000, '2026-09-07T11:00:00Z')).toEqual({ ...met, progress: 2000 });
  expect(applyProgress(rule, row, -20, '2026-09-07T10:00:00Z')).toEqual(row);
  expect(
    applyProgress(
      { ...rule, mode: { kind: 'state', activity: 'walking', place: 'either' } },
      row,
      9000,
      '2026-09-07T10:00:00Z',
    ).met,
  ).toBe(false);
  expect(
    applyProgress(
      { ...rule, activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' } },
      row,
      1,
      '2026-09-07T10:00:00Z',
    ).met,
  ).toBe(true);
  expect(() => applyProgress(rule, row, NaN, '2026-09-07T10:00:00Z')).toThrow('Invalid progress');
});

test('walking minutes latch met at the goal', () => {
  const durationRule = {
    ...rule,
    mode: { kind: 'target' as const, activity: 'walking' as const, metric: 'minutes' as const, goal: 20, place: 'either' as const },
  };
  expect(applyProgress(durationRule, row, 19.9, '2026-09-07T10:00:00Z').met).toBe(false);
  const met = applyProgress(durationRule, row, 20, '2026-09-07T10:01:00Z');
  expect(met).toMatchObject({ progress: 20, met: true, metAt: '2026-09-07T10:01:00Z' });
  expect(applyProgress(durationRule, met, 18, '2026-09-07T11:00:00Z')).toMatchObject({ met: true });
});

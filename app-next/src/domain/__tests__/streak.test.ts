import { streak, isMetDay } from '../streak';
import { rule } from './fixtures';
test('unscheduled days are transparent and today remains in progress until it ends', () => {
  const days = [
    { day: '2026-09-03', scheduled: true, met: true },
    { day: '2026-09-04', scheduled: true, met: true },
    { day: '2026-09-05', scheduled: false, met: false },
    { day: '2026-09-06', scheduled: false, met: false },
    { day: '2026-09-07', scheduled: true, met: false },
  ];
  expect(streak(days, '2026-09-07')).toEqual({ current: 2, longest: 2 });
  expect(streak(days, '2026-09-08')).toEqual({ current: 0, longest: 2 });
  expect(streak([...days, { day: '2026-09-08', scheduled: true, met: true }], '2026-09-08')).toEqual({
    current: 1,
    longest: 2,
  });
  expect(streak([], '2026-09-07')).toEqual({ current: 0, longest: 0 });
  const state = { ...rule, mode: { kind: 'state' as const, activity: 'walking' as const } };
  expect(isMetDay([state], [], 10)).toBe(true);
  expect(isMetDay([state], [], 9)).toBe(false);
  expect(isMetDay([state, rule], [], 20)).toBe(false);
  expect(isMetDay([rule], [{ ruleId: 'walk', day: '2026-09-07', progress: 5000, met: true, metAt: null }], 0)).toBe(
    true,
  );
  expect(isMetDay([{ ...rule, enabled: false }], [], 20)).toBe(false);
});

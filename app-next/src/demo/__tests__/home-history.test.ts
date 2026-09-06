import { todayHistory } from '../../state/todayHistory';
import { scenarios } from '../scenarios';
test('today uses live rule completion instead of optimistic scenario history', () => {
  const s = scenarios.find((s) => s.id === 'home-locked-walking')!;
  const rows = todayHistory(s.history, s.rules, s.ruleDays, s.clock.now, s.clock.timezone);
  expect(rows.at(-1)?.met).toBe(false);
  expect(rows.at(-1)?.scheduled).toBe(true);
  expect(
    todayHistory(
      s.history,
      s.rules.map((r) => ({ ...r, enabled: false })),
      s.ruleDays,
      s.clock.now,
      s.clock.timezone,
    ).at(-1)?.scheduled,
  ).toBe(false);
});

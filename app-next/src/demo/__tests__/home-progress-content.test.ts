import { progressContent } from '../../features/home/progressContent';
import { scenarios } from '../scenarios';
test.each([
  'home-locked-walking',
  'home-walking-session',
  'gym-arrival-user',
  'gym-time-user',
  'multi-rule-overlap',
])('%s progress variant', (id) => {
  const s = scenarios.find((s) => s.id === id)!;
  expect(
    progressContent(
      s.rules[0],
      s.ruleDays[0] ?? { ruleId: s.rules[0].id, day: '2026-09-07', progress: 0, met: false, metAt: null },
      s.permissions,
      s.walkingSession ?? null,
      s.clock.now,
      false,
    ),
  ).toMatchSnapshot();
});

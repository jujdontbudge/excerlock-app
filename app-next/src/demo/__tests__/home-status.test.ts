import { statusContent } from '../../features/home/statusContent';
import { scenarios } from '../scenarios';
import { resolveLock } from '../../domain/resolveLock';
import { makeRule } from '../scenarios/base';
const scenario = scenarios.find((s) => s.id === 'home-locked-walking')!;
function content(overrides: Partial<typeof scenario> = {}) {
  const s = { ...scenario, ...overrides };
  return statusContent({
    decision: resolveLock({
      now: s.clock.now,
      timezone: s.clock.timezone,
      rules: s.rules,
      ruleDays: s.ruleDays,
      earnedUnlocks: s.earnedUnlocks ?? [],
      walkingSession: s.walkingSession ?? null,
      gymPresence: null,
    }),
    rules: s.rules,
    permissions: s.permissions,
    apps: s.lockedApps,
    now: s.clock.now,
    timezone: s.clock.timezone,
  });
}
test.each([
  'home-locked-walking',
  'home-unlocked-met',
  'home-walking-session',
  'home-before-window',
  'home-no-rules',
  'home-permission-needed',
  'home-no-apps',
])('%s status content', (id) => expect(content(scenarios.find((s) => s.id === id))).toMatchSnapshot());
test('no rules today, after window and all paused are distinct', () => {
  expect(content({ clock: { now: '2026-09-12T15:00:00Z', timezone: 'America/New_York' }, ruleDays: [] }).state).toBe(
    'noRulesToday',
  );
  expect(content({ clock: { now: '2026-09-08T02:00:00Z', timezone: 'America/New_York' } }).state).toBe('afterWindow');
  expect(content({ rules: [{ ...makeRule(), enabled: false }] }).state).toBe('allPaused');
});
test('relock and lease clocks are formatted using the scenario timezone', () => {
  const common = {
    rules: scenario.rules,
    permissions: scenario.permissions,
    apps: scenario.lockedApps,
    now: '2026-09-07T15:00:00Z',
    timezone: 'America/New_York',
  };
  expect(
    statusContent({
      ...common,
      decision: {
        state: 'unlockedMet',
        byRuleId: 'walk',
        byName: 'Walk 5,000 steps',
        metAt: '2026-09-07T15:00:00Z',
        relockAt: '2026-09-08T13:00:00Z',
      },
    }).subtitle,
  ).toBe('Blocking resumes tomorrow at 9:00\u00a0AM');
  expect(
    statusContent({
      ...common,
      decision: { state: 'unlockedWalking', sessionRuleId: 'walk', leaseUntil: '2026-09-07T15:12:40Z' },
    }).subtitle,
  ).toBe('12:40 left');
});

test('a provisional gym unlock says the apps are open while presence holds', () => {
  const model = statusContent({
    rules: scenario.rules,
    permissions: scenario.permissions,
    apps: scenario.lockedApps,
    now: '2026-09-07T15:00:00Z',
    timezone: 'America/New_York',
    decision: {
      state: 'unlockedProvisional',
      byRuleId: 'walk',
      placeId: 'gym-1',
      holdsUntil: '2026-09-07T16:00:00Z',
    },
  });
  expect(model.unlocked).toBe(true);
  expect(model.title).toBe("Unlocked while you're at the gym");
  expect(model.subtitle).toBe('Your apps stay open while you are here.');
});

test('a null selection handle shows the no-apps state even with stale non-zero counts', () => {
  expect(content({ lockedApps: { handle: null, appCount: 3, categoryCount: 1 } }).state).toBe('noAppsSelected');
});

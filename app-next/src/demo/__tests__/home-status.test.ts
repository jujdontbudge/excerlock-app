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
      detection: s.id === 'home-walking-session' ? { state: 'active', since: s.clock.now } : { state: 'inactive', since: null },
      placement: { state: 'unknown', liveRelief: false, since: null },
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
test('relock copy uses the scenario timezone and live walking has no countdown', () => {
  const common = { rules: scenario.rules, permissions: scenario.permissions, apps: scenario.lockedApps, now: '2026-09-07T15:00:00Z', timezone: 'America/New_York' };
  expect(statusContent({ ...common, decision: { state: 'unlockedMet', byRuleId: 'walk', byName: 'Walking', metAt: '2026-09-07T14:00:00Z', relockAt: '2026-09-08T13:00:00Z' } }).subtitle).toBe('Blocking resumes tomorrow at 9:00\u00a0AM');
  expect(statusContent({ ...common, decision: { state: 'unlockedWalking', ruleId: 'walk', since: '2026-09-07T14:59:00Z' } }).subtitle).not.toMatch(/\d+:\d+/);
});
test('a confirmed gym presence reads as unlocked while there, with the time note for minute goals', () => {
  const gym = scenarios.find((s) => s.id === 'gym-time-user')!;
  const decision = resolveLock({
    now: gym.clock.now,
    timezone: gym.clock.timezone,
    rules: gym.rules,
    ruleDays: gym.ruleDays,
    detection: { state: 'inactive', since: null },
    placement: { state: 'unknown', liveRelief: false, since: null },
    gymPresence: { placeId: 'p', startedAt: gym.clock.now, confirmedAt: gym.clock.now },
  });
  const model = statusContent({
    decision,
    rules: gym.rules,
    permissions: gym.permissions,
    apps: gym.lockedApps,
    now: gym.clock.now,
    timezone: gym.clock.timezone,
  });
  expect(model.state).toBe('unlockedAtGym');
  expect(model.unlocked).toBe(true);
  expect(model.title).toBe('Unlocked while at the gym');
  expect(model.subtitle).toContain('Leaving the gym pauses it');
});

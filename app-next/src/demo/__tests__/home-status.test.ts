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
    }).nextChange,
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
  expect(model.title).toBe("Unlocked while you're here");
  expect(model.subtitle).toBe('Your apps stay open while you are here.');
});

test('a null selection handle shows the no-apps state even with stale non-zero counts', () => {
  expect(content({ lockedApps: { handle: null, appCount: 3, categoryCount: 1 } }).state).toBe('noAppsSelected');
});

test('permission and app-selection failures never use the rest-day headline', () => {
  expect(content({ permissions: { ...scenario.permissions, screenTime: 'denied' } })).toMatchObject({
    state: 'permissionNeeded',
    title: 'Nothing is being blocked',
    icon: 'shield',
    unlocked: false,
  });
  expect(content({ lockedApps: { handle: null, appCount: 0, categoryCount: 0 } })).toMatchObject({
    state: 'noAppsSelected',
    title: 'Nothing is being blocked',
    subtitle: 'No apps are chosen, so there is nothing to block.',
    action: 'apps',
    unlocked: false,
  });
});

test('a lapse and a failed apply precede every ordinary Home state', () => {
  const common = {
    decision: { state: 'noRulesToday' as const, nextLockAt: null },
    rules: scenario.rules,
    permissions: scenario.permissions,
    apps: scenario.lockedApps,
    now: '2026-09-07T15:00:00Z',
    timezone: 'America/New_York',
  };
  expect(statusContent({ ...common, lapsed: true })).toMatchObject({
    state: 'lapsed',
    title: 'Blocking is paused',
    action: 'plans',
    unlocked: false,
  });
  expect(statusContent({ ...common, enforcement: { applied: false } })).toMatchObject({
    state: 'enforcementFailed',
    title: 'Blocking is not on',
    action: 'retry',
    unlocked: false,
  });
});

test('a locked card names the goal unless this launch has not claimed progress yet', () => {
  const common = {
    decision: {
      state: 'locked' as const,
      activeRuleIds: ['walk'],
      nextUnlockHint: { ruleId: 'walk', action: 'progress' as const, remaining: 1800, goal: 5000, unit: 'steps' },
    },
    rules: scenario.rules,
    permissions: scenario.permissions,
    apps: scenario.lockedApps,
    now: '2026-09-07T15:00:00Z',
    timezone: 'America/New_York',
  };
  expect(statusContent(common)).toMatchObject({
    title: 'Apps are blocked',
    subtitle: 'Until you walk 1,800 steps',
  });
  expect(statusContent({ ...common, lastClaimAt: null })).toMatchObject({
    title: 'Apps are blocked',
    subtitle: "Checking today's activity\u2026",
  });
});

test('a met day names the condition that earned it, and a claim on open says so', () => {
  const common = {
    decision: {
      state: 'unlockedMet' as const,
      byRuleId: 'walk',
      byName: 'Walk 5,000 steps',
      metAt: '2026-09-07T15:00:00Z',
      relockAt: null,
    },
    rules: scenario.rules,
    permissions: scenario.permissions,
    apps: scenario.lockedApps,
    now: '2026-09-07T15:00:00Z',
    timezone: 'America/New_York',
  };
  expect(statusContent(common)).toMatchObject({
    title: 'Unlocked for the rest of today',
    subtitle: 'Unlocked by Walk 5,000 steps',
  });
  expect(statusContent({ ...common, caughtUp: true })).toMatchObject({
    subtitle: 'Unlocked \u2014 we caught up while the app was closed',
  });
});

test('a provisional unlock counts the gym goal that will earn the day', () => {
  const gym = {
    ...makeRule(),
    id: 'gym-time',
    activity: 'gym' as const,
    mode: { kind: 'target' as const, activity: 'gym' as const, metric: 'minutes' as const, goal: 20 },
  };
  expect(
    statusContent({
      decision: {
        state: 'unlockedProvisional',
        byRuleId: 'gym-time',
        placeId: 'gym-1',
        holdsUntil: '2026-09-07T16:00:00Z',
      },
      rules: [gym],
      permissions: scenario.permissions,
      apps: scenario.lockedApps,
      now: '2026-09-07T15:00:00Z',
      timezone: 'America/New_York',
    }),
  ).toMatchObject({ title: "Unlocked while you're here", subtitle: '20 minutes counts the day' });
});

test('an open day before its window says when blocking starts and offers a head start', () => {
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
      decision: { getAheadRuleId: null, state: 'beforeWindow', nextLockAt: '2026-09-07T17:00:00.000Z', ruleId: 'walk' },
    }),
  ).toMatchObject({ title: 'Blocking starts at 1:00\u00a0PM', subtitle: 'Your apps are open until then.' });
  expect(
    statusContent({
      ...common,
      decision: {
        state: 'beforeWindow',
        nextLockAt: '2026-09-07T17:00:00.000Z',
        ruleId: 'walk',
        getAheadRuleId: 'walk',
      },
    }),
  ).toMatchObject({ subtitle: 'Get ahead: walk 5,000 steps now' });
});

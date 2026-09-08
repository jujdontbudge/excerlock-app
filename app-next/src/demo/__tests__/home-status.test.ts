import { statusContent } from '../../features/home/statusContent';
import { scenarios } from '../scenarios';
import { resolveLock } from '../../domain/resolveLock';
import { base, makeRule } from '../scenarios/base';

const walking = scenarios.find((s) => s.id === 'home-locked-walking')!;
function content(overrides: Partial<typeof walking> = {}) {
  const s = { ...walking, ...overrides };
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

const scenario = base('status-test', 'Status test');
const input = {
  decision: { state: 'noRulesToday', nextLockAt: null } as const,
  rules: scenario.rules,
  apps: scenario.lockedApps,
  permissions: scenario.permissions,
  now: scenario.clock.now,
  timezone: scenario.clock.timezone,
};

test('no rules today, after window and all paused are distinct', () => {
  expect(content({ clock: { now: '2026-09-12T15:00:00Z', timezone: 'America/New_York' }, ruleDays: [] }).state).toBe(
    'noRulesToday',
  );
  expect(content({ clock: { now: '2026-09-08T02:00:00Z', timezone: 'America/New_York' } }).state).toBe('afterWindow');
  expect(content({ rules: [{ ...makeRule(), enabled: false }] }).state).toBe('allPaused');
});

test('permission and app-selection failures never use the rest-day headline', () => {
  expect(statusContent({ ...input, permissions: { ...input.permissions, screenTime: 'denied' } })).toMatchObject({
    state: 'permissionNeeded',
    title: 'Nothing is being blocked',
    icon: 'shield',
    unlocked: false,
  });
  expect(statusContent({ ...input, apps: { handle: null, appCount: 0, categoryCount: 0 } })).toMatchObject({
    state: 'noAppsSelected',
    title: 'Nothing is being blocked',
    subtitle: 'No apps are chosen, so there is nothing to block.',
    action: 'apps',
    unlocked: false,
  });
  expect(statusContent(input)).toMatchObject({
    state: 'noRulesToday',
    title: 'No blocking right now',
    icon: 'lock-open',
    unlocked: true,
  });
});

test('lapse and enforcement failure precede every ordinary Home state', () => {
  expect(statusContent({ ...input, lapsed: true })).toMatchObject({
    state: 'lapsed',
    title: 'Blocking is paused',
    subtitle: 'Your subscription ended, so your apps are open. Start a plan to switch blocking back on.',
    action: 'plans',
  });
  expect(statusContent({ ...input, enforcement: { applied: false } })).toMatchObject({
    state: 'enforcementFailed',
    title: "Blocking couldn't be applied",
    action: 'retry',
    unlocked: false,
  });
  expect(statusContent({ ...input, enforcement: { applied: true } }).state).not.toBe('enforcementFailed');
});

test('locked status shows its headline and hint unless the first claim is pending', () => {
  const decision = {
    state: 'locked' as const,
    activeRuleIds: ['walk'],
    nextUnlockHint: { ruleId: 'walk', action: 'progress' as const, remaining: 1800, goal: 5000, unit: 'steps' },
  };
  expect(statusContent({ ...input, decision })).toMatchObject({
    title: 'Apps are blocked',
    subtitle: 'Until you walk 1,800 steps',
  });
  expect(statusContent({ ...input, decision, lastClaimAt: null })).toMatchObject({
    title: 'Apps are blocked',
    subtitle: "Checking today's activity…",
  });
});

test('met, provisional, walking, before-window and rest-day copy use the decision fields', () => {
  const met = {
    state: 'unlockedMet' as const,
    byRuleId: 'walk',
    byName: 'Walk 5,000 steps',
    metAt: '2026-09-07T15:00:00.000Z',
    relockAt: null,
  };
  expect(statusContent({ ...input, decision: met })).toMatchObject({
    title: 'Unlocked for the rest of today',
    subtitle: 'Unlocked by Walk 5,000 steps',
  });
  expect(statusContent({ ...input, caughtUp: true, decision: met })).toMatchObject({
    subtitle: 'Unlocked — we caught up while the app was closed',
  });
  expect(
    statusContent({
      ...input,
      decision: { ...met, relockAt: '2026-09-08T13:00:00.000Z' },
    }).nextChange,
  ).toBe('Blocking resumes tomorrow at 9:00 AM');
  expect(
    statusContent({
      ...input,
      decision: { state: 'beforeWindow', nextLockAt: '2026-09-07T17:00:00.000Z', ruleId: 'walk', getAheadRuleId: null },
    }),
  ).toMatchObject({ title: 'Blocking starts at 1:00 PM', subtitle: 'Your apps are open until then.' });
  expect(
    statusContent({
      ...input,
      decision: {
        state: 'beforeWindow',
        nextLockAt: '2026-09-07T17:00:00.000Z',
        ruleId: 'walk',
        getAheadRuleId: 'walk',
      },
    }),
  ).toMatchObject({ subtitle: 'Get ahead: walk 5,000 steps now' });
  expect(
    statusContent({ ...input, decision: { state: 'noRulesToday', nextLockAt: '2026-09-08T13:00:00.000Z' } }),
  ).toMatchObject({ subtitle: 'Blocking resumes tomorrow at 9:00 AM' });
});

test('a minutes goal counts the whole day while a gym arrival only holds while presence does', () => {
  const provisional = {
    state: 'unlockedProvisional' as const,
    byRuleId: 'gym',
    placeId: 'gym-1',
    holdsUntil: '2026-09-07T16:00:00Z',
  };
  const minutes = makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 20 });
  expect(statusContent({ ...input, rules: [minutes], decision: provisional })).toMatchObject({
    title: "Unlocked while you're here",
    subtitle: '20 minutes counts the day',
  });
  const arrival = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const model = statusContent({ ...input, rules: [arrival], decision: provisional });
  expect(model.unlocked).toBe(true);
  expect(model.title).toBe("Unlocked while you're at the gym");
  expect(model.subtitle).toBe('Your apps stay open while you are here.');
});

test('a null selection handle shows the no-apps state even with stale non-zero counts', () => {
  expect(content({ lockedApps: { handle: null, appCount: 3, categoryCount: 1 } }).state).toBe('noAppsSelected');
});

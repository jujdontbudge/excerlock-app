import { statusContent } from '../../features/home/statusContent';
import { base } from '../scenarios/base';

const scenario = base('status-test', 'Status test');
const input = {
  decision: { state: 'noRulesToday' } as const,
  rules: scenario.rules,
  apps: scenario.lockedApps,
  permissions: scenario.permissions,
  now: scenario.clock.now,
  timezone: scenario.clock.timezone,
};

test('permission and app-selection failures never use the rest-day headline', () => {
  expect(
    statusContent({ ...input, permissions: { ...input.permissions, screenTime: 'denied' } }),
  ).toMatchObject({ state: 'permissionNeeded', title: 'Nothing is being blocked', icon: 'shield', unlocked: false });
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
    action: 'plans',
  });
  expect(statusContent({ ...input, enforcementFailed: true })).toMatchObject({
    state: 'enforcementFailed',
    title: "Blocking couldn't be applied",
    action: 'retry',
    unlocked: false,
  });
});

test('locked status shows its headline and hint unless the first claim is pending', () => {
  const decision = {
    state: 'locked',
    activeRuleIds: ['walk'],
    nextUnlockHint: { ruleId: 'walk', action: 'progress', remaining: 1800, unit: 'steps' },
  } as const;
  expect(statusContent({ ...input, decision })).toMatchObject({
    title: 'Apps are blocked',
    subtitle: 'Until you walk 1,800 steps',
  });
  expect(statusContent({ ...input, decision, lastClaimAt: null })).toMatchObject({
    title: 'Apps are blocked',
    subtitle: "Checking today's activity…",
  });
});

test('met, provisional, walking, before-window and rest-day copy use upstream fields when present', () => {
  expect(
    statusContent({
      ...input,
      decision: { state: 'unlockedMet', byRuleId: 'walk', byRuleName: 'Walk 5,000 steps', relockAt: null },
    }),
  ).toMatchObject({ title: 'Unlocked for the rest of today', subtitle: 'Unlocked by Walk 5,000 steps' });
  expect(
    statusContent({
      ...input,
      caughtUp: true,
      decision: { state: 'unlockedMet', byRuleId: 'walk', byRuleName: 'Walk 5,000 steps', relockAt: null },
    }),
  ).toMatchObject({ subtitle: 'Unlocked — we caught up while the app was closed' });
  expect(
    statusContent({ ...input, decision: { state: 'unlockedProvisional', ruleId: 'walk', minutesToCount: 20 } }),
  ).toMatchObject({ title: "Unlocked while you're here", subtitle: '20 minutes counts the day' });
  expect(
    statusContent({
      ...input,
      decision: { state: 'beforeWindow', nextLockAt: '2026-09-07T17:00:00.000Z', ruleId: 'walk' },
    }),
  ).toMatchObject({ title: 'Blocking starts at 1:00\u00a0PM', subtitle: 'Your apps are open until then.' });
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
  ).toMatchObject({ subtitle: 'Blocking resumes tomorrow at 9:00\u00a0AM' });
});

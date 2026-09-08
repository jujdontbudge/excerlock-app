import { resolveLock } from '../resolveLock';
import { EarnedUnlock, Rule } from '../types';
import { effectiveNow } from '../watermark';
import { rule, walkingSession } from './fixtures';

const now = '2026-09-07T19:00:00.000Z';
const earned = (overrides: Partial<EarnedUnlock> = {}): EarnedUnlock => ({
  day: '2026-09-07',
  ruleId: 'walk',
  ruleName: 'Walk 5,000 steps',
  metAt: '2026-09-07T10:00:00.000Z',
  windowEnd: '2026-09-07T21:00:00.000Z',
  ...overrides,
});
const base = {
  now,
  timezone: 'UTC',
  rules: [rule],
  ruleDays: [],
  earnedUnlocks: [] as EarnedUnlock[],
  walkingSession: null,
  gymPresence: null,
};

test('an earned morning condition opens an unmet evening condition until the earliest next-day window', () => {
  const morning: Rule = {
    ...rule,
    schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 720 } },
  };
  const evening: Rule = {
    ...rule,
    id: 'evening',
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1080, endMinute: 1320 } },
  };
  expect(resolveLock({ ...base, rules: [morning, evening], earnedUnlocks: [earned()] })).toEqual({
    state: 'unlockedMet',
    byRuleId: 'walk',
    byName: 'Walk 5,000 steps',
    metAt: '2026-09-07T10:00:00.000Z',
    relockAt: '2026-09-08T09:00:00.000Z',
  });
});

test('a Friday earned unlock does not unlock Saturday but an overnight earn survives past midnight', () => {
  const weekdays: Rule = {
    ...rule,
    schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 720 } },
  };
  expect(
    resolveLock({
      ...base,
      now: '2026-09-12T12:00:00.000Z',
      rules: [weekdays],
      ruleDays: [{ ruleId: 'walk', day: '2026-09-11', progress: 5000, met: true, metAt: '2026-09-11T10:00:00Z' }],
      earnedUnlocks: [earned({ day: '2026-09-11', metAt: '2026-09-11T10:00:00Z', windowEnd: '2026-09-11T12:00:00Z' })],
    }).state,
  ).toBe('noRulesToday');

  const overnight: Rule = {
    ...rule,
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
  };
  expect(
    resolveLock({
      ...base,
      now: '2026-09-07T01:00:00.000Z',
      rules: [overnight],
      earnedUnlocks: [earned({ day: '2026-09-06', metAt: '2026-09-06T23:30:00Z', windowEnd: '2026-09-07T02:00:00Z' })],
    }),
  ).toMatchObject({ state: 'unlockedMet', relockAt: '2026-09-07T20:00:00.000Z' });
});

test('earned unlock attribution survives pausing, deleting, and rescheduling its rule', () => {
  const snapshot = earned();
  const other: Rule = { ...rule, id: 'other' };
  const paused = resolveLock({ ...base, rules: [{ ...rule, enabled: false }, other], earnedUnlocks: [snapshot] });
  const deleted = resolveLock({ ...base, rules: [other], earnedUnlocks: [snapshot] });
  const rescheduled = resolveLock({
    ...base,
    rules: [{ ...rule, schedule: { ...rule.schedule, days: [2] } }, other],
    earnedUnlocks: [snapshot],
  });
  for (const decision of [paused, deleted, rescheduled]) {
    expect(decision).toMatchObject({ state: 'unlockedMet', byRuleId: 'walk', byName: 'Walk 5,000 steps' });
  }
});

test('the earliest metAt owns the unlock regardless of store order', () => {
  const early = earned({ ruleId: 'early', ruleName: 'Early', metAt: '2026-09-07T08:00:00Z' });
  const late = earned({ ruleId: 'late', ruleName: 'Late', metAt: '2026-09-07T09:00:00Z' });
  for (const earnedUnlocks of [
    [late, early],
    [early, late],
  ]) {
    expect(resolveLock({ ...base, earnedUnlocks })).toMatchObject({
      state: 'unlockedMet',
      byRuleId: 'early',
      metAt: early.metAt,
    });
  }
  const sameTime = earned({ ruleId: 'a', ruleName: 'A', metAt: early.metAt });
  expect(resolveLock({ ...base, earnedUnlocks: [early, sameTime] })).toMatchObject({ byRuleId: 'a' });
  expect(
    resolveLock({ ...base, earnedUnlocks: [earned({ day: '2026-09-08', windowEnd: '2026-09-08T21:00:00Z' })] }).state,
  ).toBe('locked');
});

test('an earned snapshot with every rule gone has no scheduled relock', () => {
  expect(resolveLock({ ...base, rules: [], earnedUnlocks: [earned()] })).toEqual({
    state: 'unlockedMet',
    byRuleId: 'walk',
    byName: 'Walk 5,000 steps',
    metAt: '2026-09-07T10:00:00.000Z',
    relockAt: null,
  });
});

test('confirmed gym presence unlocks provisionally while an unconfirmed arrival does not', () => {
  const gym: Rule = {
    ...rule,
    id: 'gym',
    activity: 'gym',
    mode: { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 },
  };
  const presence = {
    placeId: 'gym-1',
    confirmedAt: '2026-09-07T18:59:30.000Z',
    holdsUntil: '2026-09-07T19:05:00.000Z',
  };
  expect(resolveLock({ ...base, rules: [gym], gymPresence: presence })).toEqual({
    state: 'unlockedProvisional',
    byRuleId: 'gym',
    placeId: 'gym-1',
    holdsUntil: presence.holdsUntil,
  });
  expect(resolveLock({ ...base, rules: [gym], gymPresence: null }).state).toBe('locked');
  expect(resolveLock({ ...base, rules: [gym], gymPresence: { ...presence, holdsUntil: now } }).state).toBe('locked');
  expect(
    resolveLock({
      ...base,
      rules: [gym],
      gymPresence: { ...presence, confirmedAt: '2026-09-07T19:00:01.000Z' },
    }).state,
  ).toBe('locked');
});

test('walking unlock requires a live state session inside its current window', () => {
  const state: Rule = { ...rule, id: 'state', mode: { kind: 'state', activity: 'walking', place: 'either' } };
  const session = walkingSession({
    ruleId: 'state',
    startedAt: now,
    verifiedAt: now,
    creditedThrough: now,
    leaseUntil: '2026-09-07T19:15:00.000Z',
  });
  expect(resolveLock({ ...base, rules: [state], walkingSession: session })).toEqual({
    state: 'unlockedWalking',
    sessionRuleId: 'state',
    leaseUntil: session.leaseUntil,
  });
  expect(resolveLock({ ...base, rules: [state], walkingSession: { ...session, phase: 'grace' } }).state).toBe(
    'unlockedWalking',
  );
  expect(resolveLock({ ...base, rules: [state], walkingSession: { ...session, phase: 'verifying' } }).state).toBe(
    'locked',
  );
  expect(
    resolveLock({
      ...base,
      now: '2026-09-07T22:00:00.000Z',
      rules: [state],
      walkingSession: { ...session, leaseUntil: '2026-09-07T22:15:00.000Z' },
    }).state,
  ).toBe('afterWindow');
  const duration = {
    ...state,
    mode: { kind: 'target', activity: 'walking', metric: 'minutes', goal: 20, place: 'either' },
  } as unknown as Rule;
  expect(resolveLock({ ...base, rules: [duration], walkingSession: session }).state).toBe('locked');
});

test('rewinding the observed clock does not revive an expired walking lease', () => {
  const state: Rule = {
    ...rule,
    mode: { kind: 'state', activity: 'walking', place: 'either' },
    schedule: { days: [1], window: { kind: 'allDay' } },
  };
  const watermark = '2026-09-07T19:20:00.000Z';
  const decision = resolveLock({
    ...base,
    now: effectiveNow('2026-09-07T19:00:00.000Z', watermark),
    rules: [state],
    walkingSession: walkingSession({
      ruleId: state.id,
      startedAt: '2026-09-07T18:45:00.000Z',
      verifiedAt: '2026-09-07T18:45:00.000Z',
      creditedThrough: '2026-09-07T18:45:00.000Z',
      leaseUntil: '2026-09-07T19:15:00.000Z',
    }),
  });
  expect(decision.state).toBe('locked');
});

test('active rules are locked in window-start then created-at order', () => {
  const laterCreated: Rule = { ...rule, id: 'later-created', createdAt: '2026-09-02T00:00:00Z' };
  const earlierCreated: Rule = { ...rule, id: 'earlier-created', createdAt: '2026-09-01T00:00:00Z' };
  expect(resolveLock({ ...base, rules: [laterCreated, earlierCreated] })).toMatchObject({
    state: 'locked',
    activeRuleIds: ['earlier-created', 'later-created'],
  });
  expect(
    resolveLock({
      ...base,
      rules: [earlierCreated],
      ruleDays: [
        { ruleId: 'other', day: '2026-09-07', progress: 4900, met: false, metAt: null },
        { ruleId: 'earlier-created', day: '2026-09-06', progress: 4900, met: false, metAt: null },
        { ruleId: 'earlier-created', day: '2026-09-07', progress: 1000, met: false, metAt: null },
      ],
    }),
  ).toMatchObject({ nextUnlockHint: { remaining: 4000 } });
});

test('beforeWindow separates the timeline owner from a target that can get ahead', () => {
  const state: Rule = {
    ...rule,
    id: 'state',
    createdAt: '2026-09-01T00:00:00Z',
    mode: { kind: 'state', activity: 'walking', place: 'outside' },
  };
  const target: Rule = { ...rule, id: 'target', createdAt: '2026-09-02T00:00:00Z' };
  expect(resolveLock({ ...base, now: '2026-09-07T08:00:00Z', rules: [state] })).toEqual({
    state: 'beforeWindow',
    nextLockAt: '2026-09-07T09:00:00.000Z',
    ruleId: 'state',
    getAheadRuleId: null,
  });
  expect(resolveLock({ ...base, now: '2026-09-07T08:00:00Z', rules: [state, target] })).toEqual({
    state: 'beforeWindow',
    nextLockAt: '2026-09-07T09:00:00.000Z',
    ruleId: 'state',
    getAheadRuleId: 'target',
  });
});

test('afterWindow and noRulesToday keep distinct geometry and both carry the next start', () => {
  const sunday: Rule = {
    ...rule,
    schedule: { days: [0], window: { kind: 'range', startMinute: 540, endMinute: 1200 } },
  };
  expect(resolveLock({ ...base, now: '2026-09-07T07:00:00Z', rules: [sunday] })).toEqual({
    state: 'noRulesToday',
    nextLockAt: '2026-09-13T09:00:00.000Z',
  });
  const overnight: Rule = {
    ...rule,
    schedule: { days: [0], window: { kind: 'range', startMinute: 1200, endMinute: 360 } },
  };
  expect(resolveLock({ ...base, now: '2026-09-07T07:00:00Z', rules: [overnight] })).toEqual({
    state: 'afterWindow',
    nextLockAt: '2026-09-13T20:00:00.000Z',
  });
  expect(resolveLock({ ...base, rules: [] })).toEqual({ state: 'noRulesToday', nextLockAt: null });
});

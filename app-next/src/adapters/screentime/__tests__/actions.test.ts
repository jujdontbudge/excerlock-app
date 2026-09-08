import { enforcementPlan } from '../../../domain/enforcement';
import { mergedLockIntervals } from '../../../domain/lockIntervals';
import { compileMonitorPlan, LockWindowMonitor } from '../../../domain/monitorPlan';
import { resolveLock } from '../../../domain/resolveLock';
import { EarnedUnlock, Entitlement, LockDecision, Rule, WalkingSession } from '../../../domain/types';
import { rule } from '../../../domain/__tests__/fixtures';
import { monitorActions, openWindow, startAction } from '../actions';

const timezone = 'America/New_York';
const active: Entitlement = { status: 'active', renewsAt: null };
// Locks 21:00–23:00 every day, so "the next interval" is always tonight's.
const evening: Rule = {
  ...rule,
  mode: { kind: 'state', activity: 'walking', place: 'outside' },
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1260, endMinute: 1380 } },
};

const monitorsFrom = (now: string) =>
  compileMonitorPlan(mergedLockIntervals([evening], '2026-09-07', 8, timezone), now).monitors;

const decisionAt = (now: string, over: { earnedUnlocks?: EarnedUnlock[]; walkingSession?: WalkingSession | null }) =>
  resolveLock({
    now,
    timezone,
    rules: [evening],
    ruleDays: [],
    earnedUnlocks: over.earnedUnlocks ?? [],
    walkingSession: over.walkingSession ?? null,
    gymPresence: null,
  });

const nextStartAction = (now: string, decision: LockDecision) => {
  const plan = enforcementPlan({ entitlement: active, decision });
  const [next] = monitorsFrom(now);
  return startAction(next, openWindow(decision, plan));
};

const met = (day: string, windowEnd: string): EarnedUnlock => ({
  day,
  ruleId: 'walk',
  ruleName: 'Walk',
  metAt: `${day}T14:00:00.000Z`,
  windowEnd,
});

test('a goal met today leaves tonight closed until the unlock relocks', () => {
  const now = '2026-09-07T18:00:00.000Z'; // 14:00 local, before tonight's 21:00 window
  const decision = decisionAt(now, { earnedUnlocks: [met('2026-09-07', '2026-09-08T03:00:00.000Z')] });

  expect(decision.state).toBe('unlockedMet');
  expect(nextStartAction(now, decision)).toBe('unblockSelection');
});

test('a goal met yesterday shields at tonight’s interval start', () => {
  const now = '2026-09-08T18:00:00.000Z';
  const decision = decisionAt(now, { earnedUnlocks: [met('2026-09-07', '2026-09-08T03:00:00.000Z')] });

  expect(decision.state).not.toBe('unlockedMet');
  expect(nextStartAction(now, decision)).toBe('blockSelection');
});

test('the first interval after the unlock relocks shields again', () => {
  const now = '2026-09-07T18:00:00.000Z';
  const decision = decisionAt(now, { earnedUnlocks: [met('2026-09-07', '2026-09-08T03:00:00.000Z')] });
  const relockAt = decision.state === 'unlockedMet' ? decision.relockAt : null;
  const after = monitorsFrom(now).filter((monitor) => Date.parse(monitor.start) >= Date.parse(relockAt!));

  expect(relockAt).toBe('2026-09-09T01:00:00.000Z'); // tomorrow 21:00 local
  expect(after.map((monitor) => startAction(monitor, openWindow(decision, enforcementPlan({ entitlement: active, decision }))))).toEqual(
    ['blockSelection', 'blockSelection', 'blockSelection', 'blockSelection', 'blockSelection', 'blockSelection', 'blockSelection'],
  );
});

test('a live walking lease leaves the interval it covers open, an expired one shields', () => {
  const walking: WalkingSession = {
    ruleId: 'walk',
    startedAt: '2026-09-08T01:05:00.000Z',
    leaseUntil: '2026-09-08T01:20:00.000Z',
    phase: 'walking',
  };
  const live = decisionAt('2026-09-08T01:10:00.000Z', { walkingSession: walking });
  const expired = decisionAt('2026-09-08T01:25:00.000Z', { walkingSession: walking });

  expect(live.state).toBe('unlockedWalking');
  expect(nextStartAction('2026-09-08T01:10:00.000Z', live)).toBe('unblockSelection');
  expect(expired.state).toBe('locked');
  expect(nextStartAction('2026-09-08T01:25:00.000Z', expired)).toBe('blockSelection');
});

test('an unlock with no scheduled relock leaves every interval open', () => {
  const decision: LockDecision = { state: 'unlockedMet', byRuleId: 'walk', byName: 'Walk', metAt: '2026-09-07T14:00:00.000Z', relockAt: null };
  const open = openWindow(decision, enforcementPlan({ entitlement: active, decision }));

  expect(open).toEqual({ kind: 'openEnded' });
  expect(monitorsFrom('2026-09-07T18:00:00.000Z').map((monitor) => startAction(monitor, open))).toEqual(
    Array(8).fill('unblockSelection'),
  );
});

test('shields the plan asked for outrank an unlocked decision', () => {
  const decision: LockDecision = { state: 'unlockedMet', byRuleId: 'walk', byName: 'Walk', metAt: '2026-09-07T14:00:00.000Z', relockAt: null };

  expect(openWindow(decision, { shields: 'apply', monitors: 'keep', reason: 'unknownFailClosed' })).toEqual({ kind: 'none' });
});

test('every interval end clears, because a merged window ending means no rule is active', () => {
  const monitors: LockWindowMonitor[] = monitorsFrom('2026-09-07T18:00:00.000Z');
  const configured = monitorActions(monitors, { kind: 'none' }, 'selection');

  expect(configured).toHaveLength(monitors.length);
  expect(configured[0]).toEqual({
    name: monitors[0].name,
    atStart: [{ type: 'blockSelection', familyActivitySelectionId: 'selection' }],
    atEnd: [{ type: 'unblockSelection', familyActivitySelectionId: 'selection' }],
  });
  expect(configured.every((entry) => entry.atEnd[0].type === 'unblockSelection')).toBe(true);
});

import { EnforcementPlan } from '../../../domain/enforcement';
import { mergedLockIntervals } from '../../../domain/lockIntervals';
import { compileMonitorPlan, MonitorPlan } from '../../../domain/monitorPlan';
import { LockDecision, Rule } from '../../../domain/types';
import { rule } from '../../../domain/__tests__/fixtures';
import { UNLOCK_LEASE_MONITOR } from '../../../engine/screentime/native/deviceActivitySchedule';
import { NATIVE_LOCKED_SELECTION } from '../../../engine/screentime/native/nativeSelection';
import { APP_GROUP_SHIELD_KEYS } from '../../../engine/shield/ShieldContentPublisher';
import { ApplyResult } from '../../../ports/ScreenTimePort';
import { APP_GROUP_KEYS, EnforcementFacts, readFacts } from '../appGroup';
import { usageEventName, usageMonitorName } from '../schedules';
import { deviceActivityDouble } from './DeviceActivityDouble';
import { screenTimeSubject } from './harness';

const timezone = 'America/New_York';
const NOW = '2026-09-08T01:30:00.000Z'; // 21:30 local on Monday the 7th, inside the evening window
const PLAN_NOW = '2026-09-07T04:00:00.000Z'; // local midnight, so a whole week of windows compiles
const walkingRule: Rule = { ...rule, mode: { kind: 'state', activity: 'walking', place: 'outside' } };
const daily = (window: Rule['schedule']['window']): Rule => ({
  ...walkingRule,
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window },
});
const evening = daily({ kind: 'range', startMinute: 1260, endMinute: 1380 }); // 21:00–23:00 local

const shielding: EnforcementPlan = { shields: 'apply', monitors: 'keep', reason: 'decisionLocked' };
const clearing: EnforcementPlan = { shields: 'clear', monitors: 'keep', reason: 'decisionOpen' };
const lapsed: EnforcementPlan = { shields: 'clear', monitors: 'unregister', reason: 'entitlementLapsed' };

const locked: LockDecision = {
  state: 'locked',
  activeRuleIds: ['walk'],
  nextUnlockHint: { ruleId: 'walk', action: 'walk', remaining: null, goal: null, unit: null },
};
const open: LockDecision = { state: 'noRulesToday', nextLockAt: null };
const walking = (leaseUntil: string): LockDecision => ({ state: 'unlockedWalking', sessionRuleId: 'walk', leaseUntil });
const metToday = (relockAt: string | null): LockDecision => ({
  state: 'unlockedMet',
  byRuleId: 'walk',
  byName: 'Walk',
  metAt: '2026-09-07T17:00:00.000Z',
  relockAt,
});

const planFor = (rules: Rule[], fromDay = '2026-09-07', days = 8, now = PLAN_NOW): MonitorPlan =>
  compileMonitorPlan(mergedLockIntervals(rules, fromDay, days, timezone), now);

const facts = (native: ReturnType<typeof deviceActivityDouble>): EnforcementFacts => readFacts(native.api)!;
const startsWith = (native: ReturnType<typeof deviceActivityDouble>, name: string) =>
  native.actionsFor(name, 'intervalDidStart')!.actions[0].type;

test('a locked decision shields the selection and arms every window in the plan', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);

  await expect(adapter.applyLock(locked, shielding, plan)).resolves.toEqual({
    applied: true,
    shields: 'up',
    monitors: plan.monitors.length,
  });
  expect(native.blocked).toBe(true);
  expect([...native.monitors.keys()]).toEqual(expect.arrayContaining(plan.monitors.map((m) => m.name)));
  expect(startsWith(native, plan.monitors[0].name)).toBe('blockSelection');
  expect(native.actionsFor(plan.monitors[0].name, 'intervalDidEnd')!.actions).toEqual([
    { type: 'unblockSelection', familyActivitySelectionId: NATIVE_LOCKED_SELECTION },
  ]);
  expect(facts(native)).toMatchObject({ shieldsDesired: 'up', entitled: true, planHash: plan.planHash });
});

test('a weekday set becomes one absolute non-repeating schedule per scheduled day', async () => {
  const { native, adapter } = await screenTimeSubject();
  const monday = daily({ kind: 'range', startMinute: 540, endMinute: 1020 });
  const plan = planFor([{ ...monday, schedule: { days: [1, 3, 5], window: monday.schedule.window } }], '2026-09-07', 7);

  await adapter.applyLock(open, clearing, plan);
  const schedules = plan.monitors.map((monitor) => native.monitors.get(monitor.name)!.schedule);

  expect(schedules).toHaveLength(3);
  expect(schedules.map((schedule) => schedule.intervalStart.day)).toEqual([7, 9, 11]);
  expect(schedules.every((schedule) => schedule.repeats === false)).toBe(true);
  expect(schedules.every((schedule) => schedule.intervalStart.hour === 9 && schedule.intervalEnd.hour === 17)).toBe(true);
});

test('a window across midnight ends on the following day', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([daily({ kind: 'range', startMinute: 1320, endMinute: 360 })], '2026-09-07', 1);

  await adapter.applyLock(open, clearing, plan);
  // The plan opens with the window that began the evening before the horizon; the last is tonight's.
  const { schedule } = native.monitors.get(plan.monitors.at(-1)!.name)!;

  expect(schedule.intervalStart).toMatchObject({ day: 7, hour: 22 });
  expect(schedule.intervalEnd).toMatchObject({ day: 8, hour: 6 });
});

test('adjacent all-day windows are one schedule spanning both local midnights', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([{ ...walkingRule, schedule: { days: [1, 2], window: { kind: 'allDay' } } }], '2026-09-07', 2);

  await adapter.applyLock(open, clearing, plan);

  expect(plan.monitors).toHaveLength(1);
  const { schedule } = native.monitors.get(plan.monitors[0].name)!;
  expect(schedule.intervalStart).toMatchObject({ day: 7, hour: 0, minute: 0 });
  expect(schedule.intervalEnd).toMatchObject({ day: 9, hour: 0, minute: 0 });
});

test('a window over a spring-forward transition keeps its wall-clock hours', async () => {
  const { native, adapter } = await screenTimeSubject({ now: '2027-03-14T06:00:00.000Z' });
  const plan = planFor(
    [{ ...walkingRule, schedule: { days: [0], window: { kind: 'range', startMinute: 60, endMinute: 300 } } }],
    '2027-03-14',
    1,
    '2027-03-14T05:00:00.000Z',
  );

  await adapter.applyLock(open, clearing, plan);
  const { schedule } = native.monitors.get(plan.monitors[0].name)!;

  expect(schedule.intervalStart).toMatchObject({ hour: 1 });
  expect(schedule.intervalEnd).toMatchObject({ hour: 5 });
  // Four wall-clock hours, three real ones: the components are what iOS must be given.
  expect(Date.parse(plan.monitors[0].end) - Date.parse(plan.monitors[0].start)).toBe(3 * 60 * 60 * 1000);
});

test('a goal met today reconfigures the windows it covers to open instead of shield', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);
  const relockAt = '2026-09-09T01:00:00.000Z'; // tomorrow 21:00 local

  await adapter.applyLock(metToday(relockAt), clearing, plan);

  const covered = plan.monitors.filter((monitor) => Date.parse(monitor.start) < Date.parse(relockAt));
  const after = plan.monitors.filter((monitor) => Date.parse(monitor.start) >= Date.parse(relockAt));
  expect(covered.map((monitor) => startsWith(native, monitor.name))).toEqual(covered.map(() => 'unblockSelection'));
  expect(after.map((monitor) => startsWith(native, monitor.name))).toEqual(after.map(() => 'blockSelection'));
  expect(native.blocked).toBe(false);
  expect(facts(native).unlockUntil).toBe(relockAt);
});

test('a confirmed gym arrival opens the windows it holds and shields the ones after it', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);
  const holdsUntil = '2026-09-08T02:00:00.000Z'; // 22:00 local, mid-window

  await adapter.applyLock({ state: 'unlockedProvisional', byRuleId: 'walk', placeId: 'gym-1', holdsUntil }, clearing, plan);

  expect(startsWith(native, plan.monitors[0].name)).toBe('unblockSelection');
  expect(startsWith(native, plan.monitors[1].name)).toBe('blockSelection');
  expect(facts(native).unlockUntil).toBe(holdsUntil);
});

test('every apply re-arms the whole plan with the intent that run decided', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);

  await adapter.applyLock(locked, shielding, plan);
  expect(plan.monitors.every((monitor) => startsWith(native, monitor.name) === 'blockSelection')).toBe(true);

  await adapter.applyLock(metToday(null), clearing, plan);

  expect(plan.monitors.every((monitor) => startsWith(native, monitor.name) === 'unblockSelection')).toBe(true);
  expect(native.starts.filter((name) => name === plan.monitors[0].name)).toHaveLength(2);
});

test('a window dropped from the plan stops being monitored', async () => {
  const { native, adapter } = await screenTimeSubject();
  const full = planFor([evening]);
  await adapter.applyLock(locked, shielding, full);

  const shorter = planFor([evening], '2026-09-07', 2);
  await adapter.applyLock(locked, shielding, shorter);

  expect([...native.monitors.keys()]).toEqual(expect.arrayContaining(shorter.monitors.map((m) => m.name)));
  expect(full.monitors.slice(shorter.monitors.length).every((monitor) => !native.monitors.has(monitor.name))).toBe(true);
});

test('a monitor that will not register leaves the shields up and reports why', async () => {
  const { native, adapter } = await screenTimeSubject();
  native.failNextStartMonitoring();

  const result = await adapter.applyLock(open, clearing, planFor([evening]));

  expect(result).toMatchObject({ applied: false, shields: 'up', reason: 'monitorRegistration' });
  expect(native.blocked).toBe(true);
});

test('a failed apply is retried rather than treated as settled', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);
  native.failNextStartMonitoring();
  await adapter.applyLock(open, clearing, plan);

  await expect(adapter.applyLock(open, clearing, plan)).resolves.toMatchObject({ applied: true, shields: 'down' });
});

test('an unauthorized or empty Screen Time setup reports its reason and shields nothing', async () => {
  const denied = await screenTimeSubject();
  denied.native.setAuthorization(1);
  await expect(denied.adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toEqual({
    applied: false,
    shields: 'down',
    monitors: 0,
    reason: 'screenTimeDenied',
  });

  const empty = await screenTimeSubject({ withoutSelection: true });
  await expect(empty.adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toEqual({
    applied: false,
    shields: 'down',
    monitors: 0,
    reason: 'noSelection',
  });
});

test('a lapsed entitlement clears the shields and unregisters every monitor, usage included', async () => {
  const { native, adapter } = await screenTimeSubject();
  await adapter.applyLock(locked, shielding, planFor([evening]));
  expect(native.monitors.has(usageMonitorName('2026-09-07'))).toBe(true);

  await expect(adapter.applyLock(locked, lapsed, planFor([evening]))).resolves.toEqual({
    applied: true,
    shields: 'down',
    monitors: 0,
  });
  expect(native.blocked).toBe(false);
  expect(native.monitors.size).toBe(0);
  expect(facts(native)).toMatchObject({ entitled: false, shieldsDesired: 'down' });
});

test('a lapse with no selection ever chosen still clears', async () => {
  const { native, adapter } = await screenTimeSubject({ withoutSelection: true });

  await expect(adapter.applyLock(locked, lapsed, planFor([evening]))).resolves.toEqual({
    applied: true,
    shields: 'down',
    monitors: 0,
  });
  expect(native.blocked).toBe(false);
});

test('a walking lease is a renewable interval that ends at the lease and shields when it lapses', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);

  await adapter.applyLock(walking('2026-09-08T01:45:00.000Z'), clearing, plan);
  expect(native.monitors.get(UNLOCK_LEASE_MONITOR)!.schedule.intervalEnd).toMatchObject({ hour: 21, minute: 45 });
  expect(native.actionsFor(UNLOCK_LEASE_MONITOR, 'intervalDidEnd')!.actions).toEqual([
    { type: 'blockSelection', familyActivitySelectionId: NATIVE_LOCKED_SELECTION },
  ]);
  expect(facts(native)).toMatchObject({ leaseUntil: '2026-09-08T01:45:00.000Z', sessionId: 'walk' });

  await adapter.applyLock(walking('2026-09-08T02:00:00.000Z'), clearing, plan);
  expect(native.monitors.get(UNLOCK_LEASE_MONITOR)!.schedule.intervalEnd).toMatchObject({ hour: 22, minute: 0 });
  expect(facts(native).leaseUntil).toBe('2026-09-08T02:00:00.000Z');

  await adapter.applyLock(locked, shielding, plan);
  expect(native.monitors.has(UNLOCK_LEASE_MONITOR)).toBe(false);
  expect(native.blocked).toBe(true);
});

test('a lease renewed mid-flight still asks for a whole increment', async () => {
  const { native, adapter } = await screenTimeSubject();
  // Five minutes of the lease are already spent, so a naive interval would be too short to accept.
  await adapter.applyLock(walking('2026-09-08T01:40:00.000Z'), clearing, planFor([evening]));
  const { schedule } = native.monitors.get(UNLOCK_LEASE_MONITOR)!;

  expect(schedule.intervalStart).toMatchObject({ hour: 21, minute: 25 });
  expect(schedule.intervalEnd).toMatchObject({ hour: 21, minute: 40 });
});

test('the shield the user would see next is published with the window copy per monitor', async () => {
  const { native, adapter } = await screenTimeSubject();
  const plan = planFor([evening]);

  await adapter.applyLock(locked, shielding, plan);
  expect(native.shared.get(APP_GROUP_SHIELD_KEYS.currentCause)).toBe('fullLock');
  expect(Object.keys(native.shared.get(APP_GROUP_KEYS.lockWindowContexts) as object)).toEqual(
    plan.monitors.map((monitor) => monitor.name),
  );

  await adapter.applyLock(walking('2026-09-08T01:45:00.000Z'), clearing, plan);
  expect(native.shared.get(APP_GROUP_SHIELD_KEYS.currentCause)).toBe('walkAndScrollEnded');
});

test('a selection the OS no longer resolves is an empty selection', async () => {
  const { native, adapter } = await screenTimeSubject();
  await expect(adapter.describeSelection()).resolves.toEqual({
    handle: { token: NATIVE_LOCKED_SELECTION },
    appCount: 4,
    categoryCount: 2,
  });

  native.setSelection(null);
  await expect(adapter.describeSelection()).resolves.toEqual({ handle: null, appCount: 0, categoryCount: 0 });
});

test('the picker asks for authorization first and reports what the user chose', async () => {
  const { native, adapter, selections } = await screenTimeSubject({
    authorization: 0,
    withoutSelection: true,
    pick: { applicationCount: 7, categoryCount: 1 },
  });

  await expect(adapter.presentAppPicker()).resolves.toEqual({
    handle: { token: NATIVE_LOCKED_SELECTION },
    appCount: 7,
    categoryCount: 1,
  });
  expect(native.authorizationRequests).toBe(1);
  expect(selections).toHaveLength(1);
});

test('a refused authorization leaves the selection as it was', async () => {
  const { native, adapter, selections } = await screenTimeSubject();
  native.setAuthorization(1);

  await expect(adapter.presentAppPicker()).resolves.toEqual({
    handle: { token: NATIVE_LOCKED_SELECTION },
    appCount: 4,
    categoryCount: 2,
  });
  expect(selections).toHaveLength(0);
});

test('a cancelled picker leaves the selection exactly as it was', async () => {
  const { adapter, selections } = await screenTimeSubject({ pick: null });

  await expect(adapter.presentAppPicker()).resolves.toEqual({
    handle: { token: NATIVE_LOCKED_SELECTION },
    appCount: 4,
    categoryCount: 2,
  });
  expect(selections[0]).toEqual({ handle: { token: NATIVE_LOCKED_SELECTION }, appCount: 4, categoryCount: 2 });
});

test('usage is measured from the day the monitor was armed and reported as it accumulates', async () => {
  const { native, adapter } = await screenTimeSubject();
  const seen: (number | null)[] = [];
  const stop = adapter.observeUsage((minutes) => seen.push(minutes));
  expect(seen).toEqual([null]);

  await adapter.applyLock(locked, shielding, planFor([evening]));
  native.fireThreshold(usageMonitorName('2026-09-07'), usageEventName(15), '2026-09-07T17:00:00.000Z');

  expect(seen.at(-1)).toBe(15);
  expect(adapter.measuredUsage('2026-09-07')).toBe(15);
  expect(adapter.measuredUsage('2026-09-06')).toBeNull();
  stop();
});

test('a usage monitor that will not arm is not a failed lock, and its day stays unmeasured', async () => {
  const { native, adapter } = await screenTimeSubject();
  native.failStartMonitoringFor(usageMonitorName('2026-09-07'));

  await expect(adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toMatchObject({
    applied: true,
    shields: 'up',
  });
  expect(adapter.measuredUsage('2026-09-07')).toBeNull();
});

test('a window that shields while the app is closed is reported when the app hears about it', async () => {
  const { native, adapter } = await screenTimeSubject();
  const seen: ApplyResult[] = [];
  await adapter.applyLock(open, clearing, planFor([evening]));
  const stop = adapter.observeEnforcement((result) => seen.push(result));

  native.emitMonitorEvent('intervalDidStart', 'up');

  expect(seen).toEqual([{ applied: true, shields: 'up', monitors: expect.any(Number) }]);
  stop();
});

test('a selection this app never issued is empty even while the OS still holds it', async () => {
  // The module rehydrates its selections from storage, so this is app storage lost with the OS
  // selection surviving. `selectionMetadata` would still report the counts, but the module will
  // not act on a handle it never issued, and showing apps as locked while every apply fails is
  // worse than asking for them again.
  const { native, adapter } = await screenTimeSubject({
    withoutSelection: true,
    osSelection: { applicationCount: 4, categoryCount: 2 },
  });
  expect(native.api.selectionMetadata({ activitySelectionId: NATIVE_LOCKED_SELECTION })).toMatchObject({
    applicationCount: 4,
  });

  await expect(adapter.describeSelection()).resolves.toEqual({
    handle: null,
    appCount: 0,
    categoryCount: 0,
  });
  await expect(adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toMatchObject({
    applied: false,
    reason: 'noSelection',
  });
});

test('a selection the OS has forgotten is empty, whatever this process remembers', async () => {
  const { native, adapter } = await screenTimeSubject();
  native.setSelection(null);

  await expect(adapter.describeSelection()).resolves.toEqual({
    handle: null,
    appCount: 0,
    categoryCount: 0,
  });
  await expect(adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toMatchObject({
    applied: false,
    reason: 'noSelection',
  });
});

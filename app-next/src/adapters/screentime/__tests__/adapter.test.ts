import { EnforcementPlan } from '../../../domain/enforcement';
import { mergedLockIntervals } from '../../../domain/lockIntervals';
import { compileMonitorPlan, MonitorPlan } from '../../../domain/monitorPlan';
import { LockDecision, LockedApps, Rule } from '../../../domain/types';
import { rule } from '../../../domain/__tests__/fixtures';
import { ApplyResult } from '../../../ports/ScreenTimePort';
import { APP_GROUP_KEYS, EnforcementFacts, readFacts } from '../appGroup';
import { LOCKED_SELECTION_ID } from '../deviceActivity';
import { LEASE_MONITOR, usageEventName, usageMonitorName } from '../schedules';
import { createScreenTimeAdapter, ScreenTimeAdapter } from '../ScreenTimeAdapter';
import { deviceActivityDouble } from './DeviceActivityDouble';

const timezone = 'America/New_York';
const NOW = '2026-09-07T18:00:00.000Z'; // 14:00 local, Monday
const evening: Rule = {
  ...rule,
  mode: { kind: 'state', activity: 'walking', place: 'outside' },
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1260, endMinute: 1380 } },
};

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

const planFor = (rules: Rule[], now = NOW): MonitorPlan =>
  compileMonitorPlan(mergedLockIntervals(rules, '2026-09-07', 8, timezone), now);

type Counts = { applicationCount: number; categoryCount: number };

function subject(options: { now?: string; selection?: Counts | null; pick?: Counts | null } = {}) {
  const native = deviceActivityDouble(options.selection === undefined ? {} : { selection: options.selection });
  const selections: LockedApps[] = [];
  const picked = options.pick === undefined ? { applicationCount: 7, categoryCount: 1 } : options.pick;
  const adapter: ScreenTimeAdapter = createScreenTimeAdapter({
    native: native.api,
    clock: { now: () => options.now ?? NOW, timezone: () => timezone },
    picker: { pick: async () => picked },
    copy: () => ({ rules: [evening], ruleDays: [], canNotify: true }),
    onSelection: (selection) => void selections.push(selection),
  });
  return { native, adapter, selections };
}

const facts = (native: ReturnType<typeof deviceActivityDouble>): EnforcementFacts => readFacts(native.api)!;

test('a locked decision shields the selection and arms every window in the plan', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);

  await expect(adapter.applyLock(locked, shielding, plan)).resolves.toEqual({
    applied: true,
    shields: 'up',
    monitors: plan.monitors.length,
  });
  expect(native.blocked).toBe(true);
  expect(native.starts).toEqual(expect.arrayContaining(plan.monitors.map((monitor) => monitor.name)));
  expect(native.actionsFor(plan.monitors[0].name, 'intervalDidStart')!.actions).toEqual([
    { type: 'blockSelection', familyActivitySelectionId: LOCKED_SELECTION_ID },
  ]);
  expect(native.actionsFor(plan.monitors[0].name, 'intervalDidEnd')!.actions).toEqual([
    { type: 'unblockSelection', familyActivitySelectionId: LOCKED_SELECTION_ID },
  ]);
  expect(facts(native)).toMatchObject({ shieldsDesired: 'up', entitled: true, planHash: plan.planHash });
});

test('a goal met today reconfigures the windows it covers to open instead of shield', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);
  const relockAt = '2026-09-09T01:00:00.000Z'; // tomorrow 21:00 local

  await adapter.applyLock(metToday(relockAt), clearing, plan);

  const covered = plan.monitors.filter((monitor) => Date.parse(monitor.start) < Date.parse(relockAt));
  const after = plan.monitors.filter((monitor) => Date.parse(monitor.start) >= Date.parse(relockAt));
  expect(covered.map((m) => native.actionsFor(m.name, 'intervalDidStart')!.actions[0].type)).toEqual(
    covered.map(() => 'unblockSelection'),
  );
  expect(after.map((m) => native.actionsFor(m.name, 'intervalDidStart')!.actions[0].type)).toEqual(
    after.map(() => 'blockSelection'),
  );
  expect(native.blocked).toBe(false);
  expect(facts(native).unlockUntil).toBe(relockAt);
});

test('an unchanged window is reconfigured, never restarted', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);

  await adapter.applyLock(locked, shielding, plan);
  const firstStarts = [...native.starts];
  await adapter.applyLock(open, clearing, plan);

  expect(native.starts).toEqual(firstStarts);
  expect(native.configured.filter((entry) => entry.callbackName === 'intervalDidStart').length).toBe(
    plan.monitors.length * 2,
  );
});

test('a window dropped from the plan stops being monitored', async () => {
  const { native, adapter } = subject();
  const full = planFor([evening]);
  await adapter.applyLock(locked, shielding, full);

  const shorter = compileMonitorPlan(mergedLockIntervals([evening], '2026-09-07', 2, timezone), NOW);
  await adapter.applyLock(locked, shielding, shorter);

  expect([...native.monitors.keys()]).toEqual(
    expect.arrayContaining(shorter.monitors.map((monitor) => monitor.name)),
  );
  expect(full.monitors.slice(shorter.monitors.length).every((monitor) => !native.monitors.has(monitor.name))).toBe(true);
});

test('a monitor that will not register leaves the shields up and reports why', async () => {
  const { native, adapter } = subject();
  native.failNextStartMonitoring();

  const result = await adapter.applyLock(open, clearing, planFor([evening]));

  expect(result).toMatchObject({ applied: false, shields: 'up', reason: 'monitorRegistration' });
  expect(native.blocked).toBe(true);
});

test('a failed apply is retried rather than treated as settled', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);
  native.failNextStartMonitoring();
  await adapter.applyLock(open, clearing, plan);

  await expect(adapter.applyLock(open, clearing, plan)).resolves.toMatchObject({ applied: true, shields: 'down' });
});

test('an unauthorized or empty Screen Time setup reports its reason and shields nothing', async () => {
  const denied = subject();
  denied.native.setAuthorization(1);
  await expect(denied.adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toEqual({
    applied: false,
    shields: 'down',
    monitors: 0,
    reason: 'screenTimeDenied',
  });

  const empty = subject({ selection: null });
  await expect(empty.adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toEqual({
    applied: false,
    shields: 'down',
    monitors: 0,
    reason: 'noSelection',
  });
});

test('a lapsed entitlement clears the shields and unregisters every monitor, usage included', async () => {
  const { native, adapter } = subject();
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

test('a walking lease is a renewable interval that ends at the lease and shields when it lapses', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);

  await adapter.applyLock(walking('2026-09-07T18:15:00.000Z'), clearing, plan);
  expect(native.monitors.get(LEASE_MONITOR)!.schedule.intervalEnd).toMatchObject({ hour: 14, minute: 15 });
  expect(native.actionsFor(LEASE_MONITOR, 'intervalDidEnd')!.actions).toEqual([
    { type: 'blockSelection', familyActivitySelectionId: LOCKED_SELECTION_ID },
  ]);
  expect(facts(native)).toMatchObject({ leaseUntil: '2026-09-07T18:15:00.000Z', sessionId: 'walk' });

  await adapter.applyLock(walking('2026-09-07T18:30:00.000Z'), clearing, plan);
  expect(native.monitors.get(LEASE_MONITOR)!.schedule.intervalEnd).toMatchObject({ hour: 14, minute: 30 });
  expect(facts(native).leaseUntil).toBe('2026-09-07T18:30:00.000Z');

  await adapter.applyLock(locked, shielding, plan);
  expect(native.monitors.has(LEASE_MONITOR)).toBe(false);
  expect(native.blocked).toBe(true);
});

test('the shield the user would see next is published with the window copy per monitor', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);

  await adapter.applyLock(locked, shielding, plan);
  expect(native.shared.get(APP_GROUP_KEYS.currentCause)).toBe('fullLock');
  expect(Object.keys(native.shared.get(APP_GROUP_KEYS.lockWindowContexts) as object)).toEqual(
    plan.monitors.map((monitor) => monitor.name),
  );

  await adapter.applyLock(walking('2026-09-07T18:15:00.000Z'), clearing, plan);
  expect(native.shared.get(APP_GROUP_KEYS.currentCause)).toBe('walkAndScrollEnded');
});

test('a selection the OS no longer resolves is an empty selection', async () => {
  const { native, adapter } = subject();
  await expect(adapter.describeSelection()).resolves.toEqual({
    handle: { token: LOCKED_SELECTION_ID },
    appCount: 4,
    categoryCount: 2,
  });

  native.setSelection(null);
  await expect(adapter.describeSelection()).resolves.toEqual({ handle: null, appCount: 0, categoryCount: 0 });
});

test('the picker asks for authorization first and reports what the user chose', async () => {
  const { native, adapter, selections } = subject();
  native.setAuthorization(0);

  await expect(adapter.presentAppPicker()).resolves.toEqual({
    handle: { token: LOCKED_SELECTION_ID },
    appCount: 7,
    categoryCount: 1,
  });
  expect(native.authorizationRequests).toBe(1);
  expect(selections).toHaveLength(1);
});

test('a refused authorization leaves the selection as it was', async () => {
  const { native, adapter, selections } = subject();
  native.setAuthorization(1);

  await expect(adapter.presentAppPicker()).resolves.toEqual({
    handle: { token: LOCKED_SELECTION_ID },
    appCount: 4,
    categoryCount: 2,
  });
  expect(selections).toHaveLength(0);
});

test('usage is measured from the day the monitor was armed and reported as it accumulates', async () => {
  const { native, adapter } = subject();
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

test('a window that shields while the app is closed is reported when the app hears about it', async () => {
  const { native, adapter } = subject();
  const seen: ApplyResult[] = [];
  await adapter.applyLock(open, clearing, planFor([evening]));
  const stop = adapter.observeEnforcement((result) => seen.push(result));

  native.emitMonitorEvent('intervalDidStart', 'up');

  expect(seen).toEqual([{ applied: true, shields: 'up', monitors: expect.any(Number) }]);
  stop();
});

test('a confirmed gym arrival opens the windows it holds and shields the ones after it', async () => {
  const { native, adapter } = subject();
  const plan = planFor([evening]);
  const holdsUntil = '2026-09-08T02:00:00.000Z'; // 22:00 local, mid-window

  await adapter.applyLock(
    { state: 'unlockedProvisional', byRuleId: 'walk', placeId: 'gym-1', holdsUntil },
    clearing,
    plan,
  );

  expect(native.actionsFor(plan.monitors[0].name, 'intervalDidStart')!.actions[0].type).toBe('unblockSelection');
  expect(native.actionsFor(plan.monitors[1].name, 'intervalDidStart')!.actions[0].type).toBe('blockSelection');
  expect(facts(native).unlockUntil).toBe(holdsUntil);
});

test('a usage monitor that will not arm is not a failed lock, and its day stays unmeasured', async () => {
  const { native, adapter } = subject();
  native.failStartMonitoringFor(usageMonitorName('2026-09-07'));

  await expect(adapter.applyLock(locked, shielding, planFor([evening]))).resolves.toMatchObject({
    applied: true,
    shields: 'up',
  });
  expect(adapter.measuredUsage('2026-09-07')).toBeNull();
});

test('a picker host that was never configured is an error, not a silent empty selection', async () => {
  const native = deviceActivityDouble();
  const adapter = createScreenTimeAdapter({
    native: native.api,
    clock: { now: () => NOW, timezone: () => timezone },
    copy: () => ({ rules: [], ruleDays: [], canNotify: true }),
  });

  await expect(adapter.presentAppPicker()).rejects.toThrow('picker host is not configured');
  adapter.dispose();
});

test('a cancelled picker leaves the selection exactly as it was', async () => {
  const { adapter, selections } = subject({ pick: null });

  await expect(adapter.presentAppPicker()).resolves.toEqual({
    handle: { token: LOCKED_SELECTION_ID },
    appCount: 4,
    categoryCount: 2,
  });
  expect(selections[0]).toEqual({ handle: { token: LOCKED_SELECTION_ID }, appCount: 4, categoryCount: 2 });
});

test('a selection the user emptied is no selection at all', async () => {
  const { adapter } = subject({ selection: { applicationCount: 0, categoryCount: 0 }, pick: { applicationCount: 0, categoryCount: 0 } });

  await expect(adapter.describeSelection()).resolves.toEqual({ handle: null, appCount: 0, categoryCount: 0 });
  await expect(adapter.presentAppPicker()).resolves.toEqual({ handle: null, appCount: 0, categoryCount: 0 });
});

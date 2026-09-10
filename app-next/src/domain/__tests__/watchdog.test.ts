import { planWatchdog, assertMonitorBudget, WATCHDOG_MS, WATCHDOG_RENEW_MS, WatchdogInput } from '../watchdog';
const now = Date.parse('2026-09-10T12:00:00Z');
const base: WatchdogInput = {
  now, decision: 'unlockedWalking', entitlement: 'active', canEnforce: true, deleting: false,
  context: { policyGeneration: 1, accountGeneration: 1, selectionVersion: 'selection-1' },
  eligibleUntil: now + 3600000, previous: null,
};
const registration = () => planWatchdog(base).register!;
test.each(['unlockedWalking', 'unlockedPropped', 'unlockedAtGym'] as const)('arms conditional %s only', (decision) => {
  expect(planWatchdog({ ...base, decision })).toMatchObject({ cancel: false, register: { start: now, end: now + WATCHDOG_MS, registeredAt: now } });
});
test.each(['locked', 'unlockedMet', 'beforeWindow', 'afterWindow', 'noRulesToday'] as const)('invalidates on %s', (decision) => {
  expect(planWatchdog({ ...base, decision, previous: registration() })).toEqual({ register: null, cancel: true });
});
test.each(['none', 'expired', 'billingIssue'] as const)('confirmed %s cancels', (entitlement) => {
  expect(planWatchdog({ ...base, entitlement, previous: registration() }).cancel).toBe(true);
});
test('authorization loss, deletion, expired window cancel', () => {
  for (const patch of [{ canEnforce: false }, { deleting: true }, { eligibleUntil: now }]) {
    expect(planWatchdog({ ...base, ...patch })).toEqual({ register: null, cancel: true });
  }
});
test('unknown never grants/renews; existing protection remains bounded', () => {
  expect(planWatchdog({ ...base, entitlement: 'unknown' })).toEqual({ register: null, cancel: false });
  expect(planWatchdog({ ...base, entitlement: 'unknown', now: now + WATCHDOG_RENEW_MS, previous: registration() })).toEqual({ register: null, cancel: false });
  expect(planWatchdog({ ...base, entitlement: 'unknown', canEnforce: false }).cancel).toBe(true);
});
test('unknown cannot preserve old-account or stale-selection authority', () => {
  expect(planWatchdog({ ...base, entitlement: 'unknown', context: { ...base.context, accountGeneration: 2 }, previous: registration() })).toEqual({ register: null, cancel: true });
});
test('renews at five minutes without asking host to cancel existing protection first', () => {
  const previous = registration();
  expect(planWatchdog({ ...base, now: now + WATCHDOG_RENEW_MS - 1, previous })).toEqual({ register: null, cancel: false });
  expect(planWatchdog({ ...base, now: now + WATCHDOG_RENEW_MS, previous })).toMatchObject({ cancel: false, register: { end: now + WATCHDOG_RENEW_MS + WATCHDOG_MS } });
});
test('short window backdates the minimum interval but never extends window eligibility', () => {
  const eligibleUntil = now + 60000;
  const plan = planWatchdog({ ...base, eligibleUntil }).register!;
  expect(plan.end).toBe(eligibleUntil);
  expect(plan.end - plan.start).toBe(WATCHDOG_MS);
  expect(plan.eligibleUntil).toBe(eligibleUntil);
});
test('fresh context, shortened window or actual wake force a fresh registration', () => {
  for (const patch of [
    { context: { ...base.context, policyGeneration: 2 } },
    { context: { ...base.context, accountGeneration: 2 } },
    { context: { ...base.context, selectionVersion: 'new-selection' } },
    { eligibleUntil: now + 30000 }, { force: true },
  ]) expect(planWatchdog({ ...base, previous: registration(), ...patch }).register).not.toBeNull();
});
test('expired registration is replaced, clock rewind cannot create new authority', () => {
  const previous = registration();
  expect(planWatchdog({ ...base, previous, now: previous.end }).register).not.toBeNull();
  expect(() => planWatchdog({ ...base, previous, now: now - 1 })).toThrow(/rewind/);
});
test('invalid time/context fails visibly', () => {
  expect(() => planWatchdog({ ...base, now: NaN })).toThrow();
  expect(() => planWatchdog({ ...base, eligibleUntil: Infinity })).toThrow();
  expect(() => planWatchdog({ ...base, context: { ...base.context, selectionVersion: '' } })).toThrow();
});
test('budget includes staged replacement monitors', () => {
  expect(() => assertMonitorBudget([7, 2, 11])).not.toThrow();
  expect(() => assertMonitorBudget([7, 2, 12])).toThrow(/20/);
  expect(() => assertMonitorBudget([7, -1])).toThrow();
});

test('explicit lapse/deletion cleanup survives stale context and clock-rewound previous registration', () => {
  expect(planWatchdog({ ...base, deleting: true, now: now - 1, previous: registration(), context: { ...base.context, selectionVersion: '' } })).toEqual({ register: null, cancel: true });
});

import { EnforcementHost, EnforcementSnapshot, EnforcementTransport } from '../enforcement/EnforcementHost';
function setup() {
  let snapshot: EnforcementSnapshot = { revision: 1, now: 0, context: { policyGeneration: 1, accountGeneration: 1, selectionVersion: 's1' }, state: 'conditional', relief: 'unlockedWalking', futureEnforcementEligible: false, eligibleUntil: 3600000 };
  const calls: string[] = [];
  const transport: EnforcementTransport = {
    publish: jest.fn(async () => { calls.push('publish'); }),
    shield: jest.fn(async () => { calls.push('shield'); return true; }),
    unshield: jest.fn(async () => { calls.push('unshield'); return true; }),
    stageWatchdog: jest.fn(async () => { calls.push('stage'); return 'watchdog-b'; }),
    commitWatchdog: jest.fn(async () => { calls.push('commit'); return true; }),
    replaceWindows: jest.fn().mockResolvedValue(undefined),
      cancelWatchdogs: jest.fn(async () => { calls.push('cancel'); }),
  };
  const report = jest.fn();
  const host = new EnforcementHost({ read: () => snapshot, transport, report });
  return { host, transport, calls, report, set: (patch: Partial<EnforcementSnapshot>) => { snapshot = { ...snapshot, ...patch }; } };
}
test('arms and commits protection BEFORE lifting shields', async () => {
  const { host, calls } = setup();
  await expect(host.reconcile()).resolves.toBe('applied');
  expect(calls).toEqual(['publish', 'stage', 'commit', 'unshield']);
});
test('renewal never cancels previous protection before staging', async () => {
  const { host, calls, set } = setup();
  await host.reconcile(); calls.length = 0; set({ now: 300000 });
  await host.reconcile();
  expect(calls).toEqual(['publish', 'stage', 'commit', 'unshield']);
});
test('registration failure shields eligible relief, reports, never unshields', async () => {
  const { host, transport, calls, report } = setup();
  transport.stageWatchdog = async () => { throw new Error('OS rejected'); };
  await expect(host.reconcile()).rejects.toThrow('OS rejected');
  expect(calls).toEqual(['publish', 'shield']); expect(report).toHaveBeenCalled();
});
test('earned/lapse cleanup failure does not manufacture shield', async () => {
  const { host, transport, set, calls } = setup(); set({ state: 'open' });
  transport.cancelWatchdogs = async () => { throw new Error('cancel failed'); };
  await expect(host.reconcile()).rejects.toThrow('cancel failed');
  expect(calls).toEqual(['publish', 'unshield']);
});
test('new generation while stage awaits revokes old unshield authority', async () => {
  const { host, transport, set, calls } = setup();
  let finish!: (id: string) => void;
  transport.stageWatchdog = () => new Promise((resolve) => { finish = resolve; });
  const old = host.reconcile();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  set({ revision: 2, state: 'open' });
  const next = host.reconcile(); finish('old');
  await expect(old).resolves.toBe('superseded'); await next;
  expect(calls).toEqual(['publish', 'publish', 'unshield', 'cancel']);
});
test('unknown preserves last applied state without renewing', async () => {
  const { host, set, calls } = setup(); await host.reconcile(); calls.length = 0;
  set({ state: 'unknown', now: 600000 });
  await expect(host.reconcile()).resolves.toBe('preserved'); expect(calls).toEqual([]);
});
test('dispose stops ownership without cancelling native safety', async () => {
  const { host, calls } = setup(); await host.reconcile(); calls.length = 0; host.dispose();
  await expect(host.reconcile()).rejects.toThrow('disposed'); expect(calls).toEqual([]);
});

test('root publishes exact future windows, skips unchanged schedule, force wake reapplies', async () => {
  const { host, transport, set } = setup();
  const windows = [{ id: 'monday', start: 1000000, end: 2000000 }];
  set({ futureEnforcementEligible: true, windows });
  await host.reconcile(); await host.reconcile();
  expect(transport.replaceWindows).toHaveBeenCalledTimes(1);
  expect(transport.replaceWindows).toHaveBeenCalledWith(windows, 1);
  await host.reconcile(true);
  expect(transport.replaceWindows).toHaveBeenCalledTimes(2);
});
test('confirmed lapse clears scheduled authority instead of retaining future windows', async () => {
  const { host, transport, set } = setup();
  set({ state: 'open', openReason: 'lapsed', futureEnforcementEligible: false, windows: [{ id: 'old', start: 1, end: 900001 }] });
  await host.reconcile();
  expect(transport.replaceWindows).toHaveBeenCalledWith([], 1);
});

test('unrepresentable schedule preserves native policy without publishing or replacing windows', async () => {
  const { host, set, transport, calls } = setup();
  set({ state: 'unknown', scheduleIssue: { reason: 'nativeWindowLimit', required: 14 } });
  await expect(host.reconcile(true)).resolves.toBe('preserved');
  expect(calls).toEqual([]);
  expect(transport.replaceWindows).not.toHaveBeenCalled();
  set({ revision: 2, state: 'open', openReason: 'deleting' });
  await expect(host.reconcile()).resolves.toBe('applied');
  expect(calls).toEqual(['publish', 'unshield', 'cancel']);
});

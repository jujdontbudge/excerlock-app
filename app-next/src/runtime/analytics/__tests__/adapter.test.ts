import { createPaywallExperimentPort, createPostHogAnalyticsAdapter, semanticScreenName, scrubAnalyticsProps, type CanonicalIdentity, type PostHogClientBoundary } from '../PostHogAnalyticsAdapter';

function fixture() {
  const calls: string[] = []; let flag: string | boolean | undefined; const listeners: (() => void)[] = [];
  const client: PostHogClientBoundary = {
    ready: async () => { calls.push('ready'); }, getDeviceId: () => (calls.push('device'), 'device-1'), getDistinctId: () => 'uid',
    register: async () => { calls.push('register'); }, identify: () => { calls.push('identify'); }, reset: () => { calls.push('reset'); },
    clearPendingQueues: async () => { calls.push('clear'); },
    optIn: async () => { calls.push('optIn'); }, optOut: async () => { calls.push('optOut'); }, capture: (e) => { calls.push(`capture:${e}`); }, screen: (s) => { calls.push(`screen:${s}`); },
    onFeatureFlags: (cb) => { listeners.push(cb); return () => undefined; }, getFeatureFlag: (_k, o) => { if (o?.sendEvent) calls.push('exposure'); return flag; },
  };
  let identity: CanonicalIdentity = { userId: 'uid', generation: 1, ready: true }; let enabled = true;
  const adapter = createPostHogAnalyticsAdapter({ client, getIdentity: () => identity, analyticsEnabled: () => enabled, getContext: () => ({ environment: 'preview', runtime_version: '1', update_id: 'embedded', walk_places: 'outside' }) });
  return { adapter, calls, setFlag(v: typeof flag) { flag = v; listeners.forEach((cb) => cb()); }, setIdentity(v: CanonicalIdentity) { identity = v; }, disable() { enabled = false; } };
}

test('primes device and registers before identify, then gates capture', async () => {
  const x = fixture(); await x.adapter.identify('uid'); x.adapter.track('condition_created'); await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls.slice(0, 5)).toEqual(['ready', 'device', 'register', 'optIn', 'identify']);
  expect(x.calls).toContain('capture:condition_created');
});
test('identify does not depend on the outer canonical-ready gate', async () => {
  const x = fixture(); x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  await x.adapter.identify('uid');
  x.adapter.track('condition_created'); await Promise.resolve();
  expect(x.calls).not.toContain('capture:condition_created');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true });
  x.adapter.track('condition_created'); await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls).toContain('capture:condition_created');
});
test('blocks provisional, stale generation, opt-out and purchase lifecycle', async () => {
  const x = fixture(); await x.adapter.identify('uid'); x.setIdentity({ userId: 'uid', generation: 2, ready: true }); x.adapter.track('condition_created');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true }); x.disable(); x.adapter.track('condition_created'); x.adapter.track('purchase_started'); await Promise.resolve();
  expect(x.calls.filter((c) => c.startsWith('capture'))).toEqual([]);
});
test('rechecks generation after an asynchronous register and clears queues on reset', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  // A generation change during the adapter's register continuation must drop capture.
  // The fixture register resolves immediately, so queue a generation change first.
  x.adapter.track('condition_created'); x.setIdentity({ userId: 'uid', generation: 2, ready: true });
  await Promise.resolve(); await Promise.resolve();
  expect(x.calls).not.toContain('capture:condition_created');
  await x.adapter.reset();
  expect(x.calls.indexOf('clear')).toBeLessThan(x.calls.indexOf('reset'));
});
test('settles control after 2s and exposes only once after mount', async () => {
  jest.useFakeTimers(); const x = fixture(); await x.adapter.identify('uid'); const pending = x.adapter.flags.get('paywall_variant'); await jest.advanceTimersByTimeAsync(2000);
  expect(await pending).toBe('control'); x.setFlag('variant_b'); expect(await x.adapter.flags.get('paywall_variant')).toBe('control');
  x.adapter.flags.expose('paywall_variant', 'onboarding'); x.adapter.flags.expose('paywall_variant', 'onboarding'); expect(x.calls.filter((c) => c === 'exposure')).toHaveLength(1); jest.useRealTimers();
});
test('paywall port exposes only the mounted, settled variant and matching generation', async () => {
  const x = fixture(); await x.adapter.identify('uid'); x.setFlag('variant_b');
  const port = createPaywallExperimentPort(x.adapter.flags);
  expect(await port.getPaywallVariant()).toBe('variant_b');
  port.trackPaywallVariantExposure({ variant: 'control', placement: 'onboarding', flowVariationId: 'flow-a', generation: 1 });
  port.trackPaywallVariantExposure({ variant: 'variant_b', placement: 'onboarding', flowVariationId: 'flow-a', generation: 2 });
  expect(x.calls).not.toContain('exposure');
  port.trackPaywallVariantExposure({ variant: 'variant_b', placement: 'onboarding', flowVariationId: 'flow-a', generation: 1 });
  expect(x.calls.filter((c) => c === 'exposure')).toHaveLength(1);
});
test('scrubs PII and route names are allowlisted', () => {
  expect(scrubAnalyticsProps({ email: 'x@y.com', reason: 'free text!', kind: 'walking', ms: 3 })).toEqual({ kind: 'walking', ms: 3 });
  expect(semanticScreenName('/settings?email=x')).toBe('settings'); expect(semanticScreenName('/users/uuid')).toBeNull();
});

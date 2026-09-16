import { createPaywallExperimentPort, createPostHogAnalyticsAdapter, createReviewPresetPort, semanticScreenName, scrubAnalyticsProps, type CanonicalIdentity, type PostHogClientBoundary } from '../PostHogAnalyticsAdapter';

function fixture() {
  const calls: string[] = []; const captures: { event: string; props?: Record<string, unknown> }[] = []; let flag: string | boolean | undefined; let payload: unknown; const listeners = new Set<() => void>(); let registerGate: Promise<void> | undefined;
  const client: PostHogClientBoundary = {
    ready: async () => { calls.push('ready'); }, getDeviceId: () => (calls.push('device'), 'device-1'), getDistinctId: () => 'uid',
    register: async () => { calls.push('register'); await registerGate; }, identify: () => { calls.push('identify'); }, reset: () => { calls.push('reset'); },
    clearPendingQueues: async () => { calls.push('clear'); },
    setPersonProperties: async (props, reload) => { calls.push(`person:${String(props.walk_places)}:${String(reload)}`); },
    optIn: async () => { calls.push('optIn'); }, optOut: async () => { calls.push('optOut'); }, capture: (e, props) => { calls.push(`capture:${e}`); captures.push({ event: e, props }); }, screen: (s) => { calls.push(`screen:${s}`); },
    onFeatureFlags: (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, getFeatureFlag: (_k, o) => { if (o?.sendEvent) calls.push('exposure'); return flag; },
    getFeatureFlagResult: (_k, o) => { if (o?.sendEvent) calls.push('exposure'); return payload === undefined ? undefined : { payload }; },
  };
  let identity: CanonicalIdentity = { userId: 'uid', generation: 1, ready: true }; let enabled = true;
  const adapter = createPostHogAnalyticsAdapter({ client, getIdentity: () => identity, analyticsEnabled: () => enabled, getContext: () => ({ environment: 'preview', runtime_version: '1', update_id: 'embedded', walk_places: 'outside' }) });
  return { adapter, calls, captures, setFlag(v: typeof flag) { flag = v; [...listeners].forEach((cb) => cb()); }, setPayload(v: unknown) { payload = v; }, setIdentity(v: CanonicalIdentity) { identity = v; }, disable() { enabled = false; }, enable() { enabled = true; }, deferRegisters() { let release!: () => void; registerGate = new Promise<void>((resolve) => { release = resolve; }); return release; } };
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

test('drops an event whose register crosses into a newly committed account', async () => {
  const x = fixture(); await x.adapter.identify('uid'); const release = x.deferRegisters();
  x.adapter.track('condition_created');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true });
  const identifying = x.adapter.identify('uid-2'); release(); await identifying; await Promise.resolve();
  expect(x.captures.filter((capture) => capture.event === 'condition_created')).toEqual([]);
});
test('sets bounded walk places only for the originating canonical account', async () => {
  const x = fixture(); await x.adapter.identify('uid'); const release = x.deferRegisters();
  x.adapter.setWalkPlaces('outside_and_treadmill');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true }); release(); await Promise.resolve(); await Promise.resolve();
  expect(x.calls.filter((call) => call.startsWith('person:'))).toEqual([]);
  await x.adapter.identify('uid-2'); x.adapter.setWalkPlaces('treadmill'); await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls).toContain('person:treadmill:false');
});
test('maps the typed walk places event to a person property and rejects unknown values', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  x.adapter.track('walk_places_updated', { walk_places: 'outside' });
  x.adapter.track('walk_places_updated', { walk_places: 'somewhere_private' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls.filter((call) => call.startsWith('person:'))).toEqual(['person:outside:false']);
  expect(x.captures.filter((capture) => capture.event === 'walk_places_updated')).toHaveLength(1);
});
test('stale identify cannot commit after canonical identity changes', async () => {
  const x = fixture(); const release = x.deferRegisters(); const identifying = x.adapter.identify('uid');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: false }); release();
  await expect(identifying).rejects.toThrow('identity changed');
  expect(x.calls).not.toContain('identify');
});
test('flag reads singleflight and an old generation cannot poison the new settlement', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  const oldA = x.adapter.flags.get('paywall_variant'); const oldB = x.adapter.flags.get('paywall_variant');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: false }); await x.adapter.identify('uid-2');
  expect(await oldA).toBe('control'); expect(await oldB).toBe('control');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true }); x.setFlag('variant_b');
  expect(await x.adapter.flags.get('paywall_variant')).toBe('variant_b');
  x.disable(); expect(await x.adapter.flags.get('paywall_variant')).toBe('control');
});
test('settles control after 2s and exposes only once after mount', async () => {
  jest.useFakeTimers(); const x = fixture(); await x.adapter.identify('uid'); const pending = x.adapter.flags.get('paywall_variant'); await jest.advanceTimersByTimeAsync(2000);
  expect(await pending).toBe('control'); x.setFlag('variant_b'); expect(await x.adapter.flags.get('paywall_variant')).toBe('control');
  x.adapter.flags.expose('paywall_variant', 'onboarding'); x.adapter.flags.expose('paywall_variant', 'onboarding'); await jest.advanceTimersByTimeAsync(0); expect(x.captures.filter((c) => c.event === '$feature_flag_called')).toHaveLength(1); expect(x.captures.at(-1)?.props).toEqual({ $feature_flag: 'paywall_variant', $feature_flag_response: 'control' }); jest.useRealTimers();
});
test('paywall port exposes only the mounted, settled variant and matching generation', async () => {
  const x = fixture(); await x.adapter.identify('uid'); x.setFlag('variant_b');
  const port = createPaywallExperimentPort(x.adapter.flags);
  expect(await port.getPaywallVariant()).toBe('variant_b');
  port.trackPaywallVariantExposure({ variant: 'control', placement: 'onboarding', flowVariationId: 'flow-a', generation: 1 });
  port.trackPaywallVariantExposure({ variant: 'variant_b', placement: 'onboarding', flowVariationId: 'flow-a', generation: 2 });
  expect(x.captures.filter((c) => c.event === '$feature_flag_called')).toHaveLength(0);
  port.trackPaywallVariantExposure({ variant: 'variant_b', placement: 'onboarding', flowVariationId: 'flow-a', generation: 1 });
  await new Promise((resolve) => setTimeout(resolve, 0)); expect(x.captures.filter((c) => c.event === '$feature_flag_called')).toHaveLength(1);
});
test('review preset is boolean, fails closed, and exposes no entered name', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  const port = createReviewPresetPort(x.adapter.flags);
  x.setFlag('not-a-boolean'); expect(await port.isEnabled()).toBe(false);
  x.adapter.flags.invalidate(); x.adapter.flags.beginGeneration(1); x.setFlag(true);
  expect(await port.isEnabled()).toBe(true); port.expose();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.captures.at(-1)?.props).toEqual({ $feature_flag: 'review_preset', $feature_flag_response: true });
});
test('scrubs PII and route names are allowlisted', () => {
  expect(scrubAnalyticsProps({ email: 'x@y.com', reason: 'free text!', kind: 'walking', ms: 3 })).toEqual({ kind: 'walking', ms: 3 });
  expect(semanticScreenName('/settings?email=x')).toBe('settings'); expect(semanticScreenName('/users/uuid')).toBeNull();
});

test('UI multi-select walking preferences become a typed person property', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  x.adapter.track('walk_places_updated', { walk_places: ['outside', 'treadmill'] });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls).toContain('person:outside_and_treadmill:false');
});

test('opt-out clears queued events and opt-in resumes only with the current preference', async () => {
  const x = fixture(); await x.adapter.identify('uid'); x.calls.length = 0;
  x.disable(); await x.adapter.setEnabled!(false);
  expect(x.calls).toEqual(['optOut', 'clear']);
  x.adapter.track('condition_created'); await Promise.resolve();
  expect(x.captures).toEqual([]);
  x.enable(); await x.adapter.setEnabled!(true);
  expect(x.calls.slice(-3)).toEqual(['optOut', 'clear', 'optIn']);
});

test('shield copy payload waits for flags to settle without an exposure event', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  const pending = x.adapter.flags.getPayload('shield_copy');
  x.setPayload({ fullLock: { title: 'Move first.' } }); x.setFlag(true);
  await expect(pending).resolves.toEqual({ fullLock: { title: 'Move first.' } });
  expect(x.calls).not.toContain('exposure');
});

test('shield copy payload settles to undefined after the timeout', async () => {
  jest.useFakeTimers(); const x = fixture(); await x.adapter.identify('uid');
  const pending = x.adapter.flags.getPayload('shield_copy'); await jest.advanceTimersByTimeAsync(2000);
  await expect(pending).resolves.toBeUndefined(); jest.useRealTimers();
});

test('shield copy payload re-reads the live SDK value after settlement', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  const first = x.adapter.flags.getPayload('shield_copy');
  x.setPayload({ fullLock: { title: 'First.' } }); x.setFlag(true);
  await expect(first).resolves.toEqual({ fullLock: { title: 'First.' } });
  x.setPayload({ fullLock: { title: 'Second.' } });
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toEqual({ fullLock: { title: 'Second.' } });
  x.setPayload(null);
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toBeNull();
});

test('shield copy payload fails closed when analytics is disabled or identity is not canonical', async () => {
  const x = fixture(); await x.adapter.identify('uid'); x.setPayload({ fullLock: { title: 'Move first.' } });
  x.disable();
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toBeUndefined();
  x.enable(); x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toBeUndefined();
  x.setIdentity({ userId: 'uid', generation: 1, ready: true }); await x.adapter.identify('uid');
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toEqual({ fullLock: { title: 'Move first.' } });
});

test('a payload settlement cannot leak across an identity generation', async () => {
  const x = fixture(); await x.adapter.identify('uid');
  const pending = x.adapter.flags.getPayload('shield_copy');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true });
  await x.adapter.identify('uid-2');
  await expect(pending).resolves.toBeUndefined();
});

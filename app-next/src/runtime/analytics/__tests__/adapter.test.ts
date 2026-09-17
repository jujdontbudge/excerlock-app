import { createPaywallExperimentPort, createReviewPresetPort, semanticScreenName, scrubAnalyticsProps } from '../PostHogAnalyticsAdapter';
import { createAnalyticsFixture, flushAdapter } from './analyticsFixture';

test('primes device and registers before identify, then gates capture', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); x.adapter.track('condition_created'); await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls.slice(0, 5)).toEqual(['ready', 'device', 'register', 'optIn', 'identify']);
  expect(x.calls).toContain('capture:condition_created');
});
test('identify does not depend on the outer canonical-ready gate', async () => {
  const x = createAnalyticsFixture(); x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  await x.adapter.identify('uid');
  x.adapter.track('condition_created'); await Promise.resolve();
  expect(x.calls).not.toContain('capture:condition_created');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true });
  x.adapter.track('condition_created'); await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls).toContain('capture:condition_created');
});
test('blocks provisional, stale generation, opt-out and purchase lifecycle', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); x.setIdentity({ userId: 'uid', generation: 2, ready: true }); x.adapter.track('condition_created');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true }); x.disable(); x.adapter.track('condition_created');
  // The registry types the port, so the blocked Adapty-owned names need a widened handle
  // to prove the runtime allowlist still refuses them.
  const transport = x.adapter.track as (event: string, props?: Record<string, unknown>) => void;
  transport('trial_started'); transport('subscription_started');
  await flushAdapter();
  expect(x.calls.filter((c) => c.startsWith('capture'))).toEqual([]);
});
test('transports the client-owned funnel events and still drops Adapty money truth', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  x.adapter.track('purchase_started', { placement: 'onboarding', plan_id: 'a.annual' });
  const transport = x.adapter.track as (event: string, props?: Record<string, unknown>) => void;
  transport('trial_started'); transport('subscription_renewed'); transport('billing_issue_detected'); transport('made_up_event');
  await flushAdapter();
  expect(x.captures).toEqual([{ event: 'purchase_started', props: { placement: 'onboarding', plan_id: 'a.annual' } }]);
});
test('rechecks generation after an asynchronous register and clears queues on reset', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  // A generation change during the adapter's register continuation must drop capture.
  // The fixture register resolves immediately, so queue a generation change first.
  x.adapter.track('condition_created'); x.setIdentity({ userId: 'uid', generation: 2, ready: true });
  await Promise.resolve(); await Promise.resolve();
  expect(x.calls).not.toContain('capture:condition_created');
  await x.adapter.reset();
  expect(x.calls.indexOf('clear')).toBeLessThan(x.calls.indexOf('reset'));
});

test('drops an event whose register crosses into a newly committed account', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); const release = x.deferRegisters();
  x.adapter.track('condition_created');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true });
  const identifying = x.adapter.identify('uid-2'); release(); await identifying; await Promise.resolve();
  expect(x.captures.filter((capture) => capture.event === 'condition_created')).toEqual([]);
});
test('sets bounded walk places only for the originating canonical account', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); const release = x.deferRegisters();
  x.adapter.setWalkPlaces('outside_and_treadmill');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true }); release(); await Promise.resolve(); await Promise.resolve();
  expect(x.calls.filter((call) => call.startsWith('person:'))).toEqual([]);
  await x.adapter.identify('uid-2'); x.adapter.setWalkPlaces('treadmill'); await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls).toContain('person:treadmill:false');
});
test('maps the typed walk places event to a person property and rejects unknown values', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  x.adapter.track('walk_places_updated', { walk_places: 'outside' });
  x.adapter.track('walk_places_updated', { walk_places: 'somewhere_private' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls.filter((call) => call.startsWith('person:'))).toEqual(['person:outside:false']);
  expect(x.captures.filter((capture) => capture.event === 'walk_places_updated')).toHaveLength(1);
});
test('stale identify cannot commit after canonical identity changes', async () => {
  const x = createAnalyticsFixture(); const release = x.deferRegisters(); const identifying = x.adapter.identify('uid');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: false }); release();
  await expect(identifying).rejects.toThrow('identity changed');
  expect(x.calls).not.toContain('identify');
});
test('flag reads singleflight and an old generation cannot poison the new settlement', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  const oldA = x.adapter.flags.get('paywall_variant'); const oldB = x.adapter.flags.get('paywall_variant');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: false }); await x.adapter.identify('uid-2');
  expect(await oldA).toBe('control'); expect(await oldB).toBe('control');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true }); x.setFlag('variant_b');
  expect(await x.adapter.flags.get('paywall_variant')).toBe('variant_b');
  x.disable(); expect(await x.adapter.flags.get('paywall_variant')).toBe('control');
});
test('settles control after 2s and exposes only once after mount', async () => {
  jest.useFakeTimers(); const x = createAnalyticsFixture(); await x.adapter.identify('uid'); const pending = x.adapter.flags.get('paywall_variant'); await jest.advanceTimersByTimeAsync(2000);
  expect(await pending).toBe('control'); x.setFlag('variant_b'); expect(await x.adapter.flags.get('paywall_variant')).toBe('control');
  x.adapter.flags.expose('paywall_variant', 'onboarding'); x.adapter.flags.expose('paywall_variant', 'onboarding'); await jest.advanceTimersByTimeAsync(0); expect(x.captures.filter((c) => c.event === '$feature_flag_called')).toHaveLength(1); expect(x.captures.at(-1)?.props).toEqual({ $feature_flag: 'paywall_variant', $feature_flag_response: 'control' }); jest.useRealTimers();
});
test('paywall port exposes only the mounted, settled variant and matching generation', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); x.setFlag('variant_b');
  const port = createPaywallExperimentPort(x.adapter.flags);
  expect(await port.getPaywallVariant()).toBe('variant_b');
  port.trackPaywallVariantExposure({ variant: 'control', placement: 'onboarding', flowVariationId: 'flow-a', generation: 1 });
  port.trackPaywallVariantExposure({ variant: 'variant_b', placement: 'onboarding', flowVariationId: 'flow-a', generation: 2 });
  expect(x.captures.filter((c) => c.event === '$feature_flag_called')).toHaveLength(0);
  port.trackPaywallVariantExposure({ variant: 'variant_b', placement: 'onboarding', flowVariationId: 'flow-a', generation: 1 });
  await new Promise((resolve) => setTimeout(resolve, 0)); expect(x.captures.filter((c) => c.event === '$feature_flag_called')).toHaveLength(1);
});
test('review preset is boolean, fails closed, and exposes no entered name', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  const port = createReviewPresetPort(x.adapter.flags);
  x.setFlag('not-a-boolean'); expect(await port.isEnabled()).toBe(false);
  x.adapter.flags.invalidate(); x.adapter.flags.beginGeneration(1); x.setFlag(true);
  expect(await port.isEnabled()).toBe(true); port.expose();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.captures.at(-1)?.props).toEqual({ $feature_flag: 'review_preset', $feature_flag_response: true });
});
test('scrubs PII and route names are allowlisted', () => {
  expect(scrubAnalyticsProps({ email: 'x@y.com', reason: 'free text!', kind: 'walking', ms: 3 })).toEqual({ kind: 'walking', ms: 3 });
  // Funnel qualifiers the paywall and step screens attach must survive the boundary,
  // including the dotted Adapty product ids.
  expect(scrubAnalyticsProps({ variation_id: 'a1b2c3d4-0000-4000-8000-000000000000', step: 'O07', plan_id: 'a.annual', has_trial: true }))
    .toEqual({ variation_id: 'a1b2c3d4-0000-4000-8000-000000000000', step: 'O07', plan_id: 'a.annual', has_trial: true });
  expect(semanticScreenName('/settings?email=x')).toEqual({ name: 'settings' }); expect(semanticScreenName('/users/uuid')).toBeNull();
});

test('maps step ids, route paths and their dynamic params to semantic screens', () => {
  expect(semanticScreenName('Home')).toEqual({ name: 'home' });
  expect(semanticScreenName('P')).toEqual({ name: 'paywall' });
  expect(semanticScreenName('O07')).toEqual({ name: 'onboarding', props: { step: 'O07' } });
  expect(semanticScreenName('/onboarding/G2')).toEqual({ name: 'onboarding', props: { step: 'G2' } });
  expect(semanticScreenName('X4')).toEqual({ name: 'setup', props: { step: 'X4' } });
  expect(semanticScreenName('/setup/X4')).toEqual({ name: 'setup', props: { step: 'X4' } });
  expect(semanticScreenName('/settings/account')).toEqual({ name: 'settings_account' });
  expect(semanticScreenName('/settings/legal/privacy')).toEqual({ name: 'settings_legal', props: { doc: 'privacy' } });
  expect(semanticScreenName('/settings/permission/screenTime')).toEqual({ name: 'settings_permission', props: { permission: 'screenTime' } });
});

test('rejects routes and ids outside the production vocabulary', () => {
  const emitted = ['/', '/dev', '/linked-trace', '/users/uuid', '/onboarding/X1', '/onboarding/P', '/setup/O07', '/settings/legal/unknown', '/settings/permission/unknown', 'O07x']
    .filter((path) => semanticScreenName(path) !== null);
  expect(emitted).toEqual([]);
});

test('emits one screen per navigation when the route subscriber and the step caller both report it', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  x.adapter.screen('/onboarding/O07'); x.adapter.screen('O07'); await flushAdapter();
  expect(x.screens).toEqual([{ name: 'onboarding', props: { step: 'O07' } }]);
  // A genuinely new screen still emits, and the step screen for the next step too.
  x.adapter.screen('/home'); x.adapter.screen('Home'); x.adapter.screen('/onboarding/O08'); await flushAdapter();
  expect(x.screens.map((call) => call.name)).toEqual(['onboarding', 'home', 'onboarding']);
  expect(x.screens.at(-1)?.props).toEqual({ step: 'O08' });
});

test('a reset lets the current screen emit again for the new identity', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  x.adapter.screen('/settings/account'); await flushAdapter();
  await x.adapter.reset(); await x.adapter.identify('uid');
  x.adapter.screen('/settings/account'); await flushAdapter();
  expect(x.screens).toHaveLength(2);
});

test('replays the screens a cold start held once the rail becomes allowed', async () => {
  const x = createAnalyticsFixture();
  x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  // Both callers of each navigation fire before the identity spine commits.
  x.adapter.screen('/onboarding/O01'); x.adapter.screen('O01');
  x.adapter.screen('/onboarding/O02'); x.adapter.screen('O02');
  await flushAdapter();
  expect(x.screens).toEqual([]);
  // Replay does nothing until consent and the spine both allow capture.
  x.adapter.replayPendingScreens(); await flushAdapter();
  expect(x.screens).toEqual([]);
  await x.adapter.identify('uid');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true });
  x.adapter.replayPendingScreens(); await flushAdapter();
  // Held screens replay oldest first, deduplicated per navigation.
  expect(x.screens).toEqual([
    { name: 'onboarding', props: { step: 'O01' } },
    { name: 'onboarding', props: { step: 'O02' } },
  ]);
  // A late duplicate of the last replayed screen stays deduplicated.
  x.adapter.screen('/onboarding/O02'); await flushAdapter();
  expect(x.screens).toHaveLength(2);
});

test('an opt-out drops held screens and consent-off requests never queue', async () => {
  const x = createAnalyticsFixture();
  x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  x.adapter.screen('/onboarding/O01');
  await x.adapter.setEnabled!(false);
  x.enable();
  x.adapter.screen('O02'); x.adapter.screen('O03'); await flushAdapter();
  // The dropped O01 is gone; only consent-on screens were held in order.
  await x.adapter.identify('uid');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true });
  x.adapter.replayPendingScreens(); await flushAdapter();
  expect(x.screens).toEqual([
    { name: 'onboarding', props: { step: 'O02' } },
    { name: 'onboarding', props: { step: 'O03' } },
  ]);
  // While consent is off nothing is even held for a later opt-in.
  x.disable(); await x.adapter.setEnabled!(false);
  x.adapter.screen('/onboarding/O04');
  x.enable(); x.adapter.replayPendingScreens(); await flushAdapter();
  expect(x.screens).toHaveLength(2);
});

test('screens held for a previous identity never replay under the next one', async () => {
  const x = createAnalyticsFixture();
  x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  x.adapter.screen('/onboarding/O01'); await flushAdapter();
  await x.adapter.reset();
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: false });
  await x.adapter.identify('uid-2');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true });
  x.adapter.replayPendingScreens(); await flushAdapter();
  expect(x.screens).toEqual([]);
});

test('UI multi-select walking preferences become a typed person property', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  x.adapter.track('walk_places_updated', { walk_places: ['outside', 'treadmill'] });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(x.calls).toContain('person:outside_and_treadmill:false');
});

test('opt-out clears queued events and opt-in resumes only with the current preference', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); x.calls.length = 0;
  x.disable(); await x.adapter.setEnabled!(false);
  expect(x.calls).toEqual(['optOut', 'clear']);
  x.adapter.track('condition_created'); await Promise.resolve();
  expect(x.captures).toEqual([]);
  x.enable(); await x.adapter.setEnabled!(true);
  expect(x.calls.slice(-3)).toEqual(['optOut', 'clear', 'optIn']);
});

test('shield copy payload waits for flags to settle without an exposure event', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  const pending = x.adapter.flags.getPayload('shield_copy');
  x.setPayload({ fullLock: { title: 'Move first.' } }); x.setFlag(true);
  await expect(pending).resolves.toEqual({ fullLock: { title: 'Move first.' } });
  expect(x.calls).not.toContain('exposure');
});

test('shield copy payload settles to undefined after the timeout', async () => {
  jest.useFakeTimers(); const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  const pending = x.adapter.flags.getPayload('shield_copy'); await jest.advanceTimersByTimeAsync(2000);
  await expect(pending).resolves.toBeUndefined(); jest.useRealTimers();
});

test('shield copy payload re-reads the live SDK value after settlement', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  const first = x.adapter.flags.getPayload('shield_copy');
  x.setPayload({ fullLock: { title: 'First.' } }); x.setFlag(true);
  await expect(first).resolves.toEqual({ fullLock: { title: 'First.' } });
  x.setPayload({ fullLock: { title: 'Second.' } });
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toEqual({ fullLock: { title: 'Second.' } });
  x.setPayload(null);
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toBeNull();
});

test('shield copy payload fails closed when analytics is disabled or identity is not canonical', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid'); x.setPayload({ fullLock: { title: 'Move first.' } });
  x.disable();
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toBeUndefined();
  x.enable(); x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toBeUndefined();
  x.setIdentity({ userId: 'uid', generation: 1, ready: true }); await x.adapter.identify('uid');
  await expect(x.adapter.flags.getPayload('shield_copy')).resolves.toEqual({ fullLock: { title: 'Move first.' } });
});

test('a payload settlement cannot leak across an identity generation', async () => {
  const x = createAnalyticsFixture(); await x.adapter.identify('uid');
  const pending = x.adapter.flags.getPayload('shield_copy');
  x.setIdentity({ userId: 'uid-2', generation: 2, ready: true });
  await x.adapter.identify('uid-2');
  await expect(pending).resolves.toBeUndefined();
});

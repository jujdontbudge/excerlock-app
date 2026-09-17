import {
  createPostHogAnalyticsAdapter,
  createSignInRequiredPort,
  type CanonicalIdentity,
  type PostHogClientBoundary,
} from '../PostHogAnalyticsAdapter';

function adapterFor(flag: string | boolean | undefined) {
  let enabled = true;
  let identity: CanonicalIdentity = { userId: 'uid', generation: 3, ready: true };
  const client: PostHogClientBoundary = {
    ready: async () => undefined,
    getDeviceId: () => 'device-1',
    getDistinctId: () => 'uid',
    register: async () => undefined,
    identify: () => undefined,
    reset: () => undefined,
    clearPendingQueues: async () => undefined,
    optIn: async () => undefined,
    optOut: async () => undefined,
    setPersonProperties: () => undefined,
    capture: () => undefined,
    screen: () => undefined,
    onFeatureFlags: () => () => undefined,
    getFeatureFlag: () => flag,
    getFeatureFlagResult: () => undefined,
  };
  const adapter = createPostHogAnalyticsAdapter({
    client,
    getIdentity: () => identity,
    analyticsEnabled: () => enabled,
    getContext: () => ({ environment: 'preview', runtime_version: '1', update_id: 'embedded', walk_places: 'none' }),
  });
  return {
    adapter,
    disable: () => {
      enabled = false;
    },
    setIdentity: (next: CanonicalIdentity) => {
      identity = next;
    },
  };
}

test('signInRequired is true only for an allow-listed true assignment', async () => {
  for (const [flag, expected] of [[true, true], [false, false], ['variant_b', false], ['control', false], [undefined, false]] as const) {
    const x = adapterFor(flag);
    await x.adapter.identify('uid');
    expect(await createSignInRequiredPort(x.adapter.flags).isRequired()).toBe(expected);
  }
});

test('signInRequired keeps the skippable default when the flag cannot be read', async () => {
  const x = adapterFor(true);
  await x.adapter.identify('uid');
  const port = createSignInRequiredPort(x.adapter.flags);
  x.disable();
  expect(await port.isRequired()).toBe(false);
  x.setIdentity({ userId: 'uid', generation: 4, ready: true });
  expect(await port.isRequired()).toBe(false);
});

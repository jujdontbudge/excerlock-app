import { AdaptySubscriptionAdapter } from '../AdaptySubscriptionAdapter';
import { entitlementStore } from '../../../state/entitlementStore';

const identity = { kind: 'canonical' as const, userId: 'uid', isAnonymous: true, generation: 4, ready: true };
const profile = (active: boolean) => ({
  customerUserId: 'uid',
  profileId: 'p',
  accessLevels: { premium: { isActive: active, isLifetime: false, isInGracePeriod: false, willRenew: active } },
});
const product = (id: string, price: string) => ({
  vendorProductId: id,
  variationId: 'variation',
  localizedTitle: id,
  localizedDescription: `${id} detail`,
  price: { localizedString: price },
  subscription: { localizedSubscriptionPeriod: 'month', subscriptionPeriod: { unit: 'month', numberOfUnits: 1 } },
});

function setup(getIdentity = () => identity) {
  let listener: ((value: unknown) => void) | null = null;
  const calls: string[] = [];
  const remove = jest.fn();
  const sdk = {
    activate: jest.fn(async () => {
      calls.push('activate');
    }),
    addEventListener: jest.fn((_event, callback) => {
      listener = callback;
      return { remove };
    }),
    identify: jest.fn(async () => {
      calls.push('identify');
    }),
    logout: jest.fn(async () => {}),
    getProfile: jest.fn(async () => profile(true)),
    getFlow: jest.fn(async () => ({ name: 'Remote title', variationId: 'variation' })),
    getPaywallProducts: jest.fn(async () => [product('z.monthly', '$7.99'), product('a.annual', '$39.99')]),
    logShowFlow: jest.fn(async () => {}),
    setIntegrationIdentifier: jest.fn(async (key, value) => {
      calls.push(`integration:${key}:${value}`);
    }),
    makePurchase: jest.fn(async () => {
      calls.push('purchase');
      return { type: 'success', profile: profile(true) };
    }),
    restorePurchases: jest.fn(async () => {
      calls.push('restore');
      return profile(false);
    }),
  };
  const adapter = new AdaptySubscriptionAdapter({
    sdk: sdk as never,
    publicSdkKey: 'public',
    getIdentity,
    waitForIdentityReady: async () => getIdentity(),
    runIdentityOperation: async (operation) => operation(),
    getPosthogDistinctId: () => 'posthog-id',
    openSubscriptionManagement: jest.fn(async () => {}),
  });
  return {
    adapter,
    sdk,
    calls,
    remove,
    emit: (value: unknown) => (listener as unknown as (profile: unknown) => void)?.(value),
  };
}

beforeEach(() => entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } }));

test('SDK4 flow preserves returned product order and exact handles', async () => {
  const { adapter, sdk } = setup();
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('onboarding');
  expect(sdk.getFlow).toHaveBeenCalledWith('onboarding', expect.objectContaining({ loadTimeoutMs: 5000 }));
  expect(paywall.products.map((item) => item.vendorProductId)).toEqual(['z.monthly', 'a.annual']);
  await adapter.purchase(paywall.products[1]!.handle);
  expect(sdk.makePurchase).toHaveBeenCalledWith(expect.objectContaining({ vendorProductId: 'a.annual' }));
});

test('dashboard flow name is never exposed as customer-facing paywall copy', async () => {
  const { adapter } = setup();
  await adapter.identify('uid');
  await expect(adapter.loadPaywall('onboarding')).resolves.toEqual(
    expect.objectContaining({ title: 'Choose your plan', body: '' }),
  );
});

test('exact PostHog identifier is awaited immediately before purchase and restore', async () => {
  const { adapter, calls } = setup();
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('in_app');
  await adapter.purchase(paywall.products[0]!.handle);
  await adapter.restore();
  expect(calls).toEqual([
    'activate',
    'identify',
    'integration:posthog_distinct_user_id:posthog-id',
    'purchase',
    'integration:posthog_distinct_user_id:posthog-id',
    'restore',
  ]);
  expect(adapter.entitlement().status).toBe('active');
});

test('paired empty restore callback cannot downgrade active but later independent lapse can', async () => {
  const { adapter, emit } = setup();
  await adapter.identify('uid');
  entitlementStore.getState().patch({ entitlement: { status: 'active', renewsAt: null } });
  const restoring = adapter.restore();
  emit(profile(false));
  await restoring;
  expect(adapter.entitlement().status).toBe('active');
  emit(profile(false));
  expect(adapter.entitlement().status).toBe('expired');
});

test('activation and profile listener are singletons and disposal removes the listener', async () => {
  const { adapter, sdk, remove } = setup();
  await adapter.identify('uid');
  await adapter.refresh();
  await adapter.loadPaywall('onboarding');
  expect(sdk.activate).toHaveBeenCalledTimes(1);
  expect(sdk.addEventListener).toHaveBeenCalledTimes(1);
  adapter.dispose();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('remote copy comes from flow.remoteConfigs and marks a recommended vendor ID without changing product order', async () => {
  const { adapter, sdk } = setup();
  sdk.getFlow.mockResolvedValueOnce({
    name: 'Fallback',
    variationId: 'variation',
    remoteConfigs: [
      { lang: 'en', data: { title: 'Remote title', body: 'Remote body', recommendedProductId: 'a.annual' }, dataString: '' },
    ],
  } as never);
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('onboarding');
  expect(paywall.title).toBe('Remote title');
  expect(paywall.body).toBe('Remote body');
  expect(paywall.products.map((item) => [item.vendorProductId, item.recommended])).toEqual([
    ['z.monthly', false],
    ['a.annual', true],
  ]);
});

test('a config list without a device-locale match still serves its first entry', async () => {
  const { adapter, sdk } = setup();
  sdk.getFlow.mockResolvedValueOnce({
    name: 'flow',
    variationId: 'variation',
    remoteConfigs: [
      { lang: 'xx', data: { title: 'First locale title', body: 'First locale body' }, dataString: '' },
      { lang: 'zz', data: { title: 'Second locale title', body: 'Second locale body' }, dataString: '' },
    ],
  } as never);
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('onboarding');
  expect(paywall.title).toBe('First locale title');
  expect(paywall.body).toBe('First locale body');
});

test.each(['pending', 'user_cancelled'] as const)('%s purchase always clears busy state', async (type) => {
  const { adapter, sdk } = setup();
  sdk.makePurchase.mockResolvedValueOnce({ type } as never);
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('in_app');
  await expect(adapter.purchase(paywall.products[0]!.handle)).resolves.toEqual({ type });
  expect(adapter.operation().busy).toBe(false);
  expect(adapter.operation().pending).toBe(type === 'pending');
});

test('a paywall reload invalidates previously loaded product handles', async () => {
  const { adapter, sdk } = setup();
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('in_app');
  await adapter.loadPaywall('in_app');
  await expect(adapter.purchase(paywall.products[0]!.handle)).rejects.toThrow('Plan expired');
  expect(sdk.makePurchase).not.toHaveBeenCalled();
});


test('paywall result from an old account cannot replace loaded plans', async () => {
  let live = identity;
  const { adapter, sdk } = setup(() => live);
  await adapter.identify('uid');
  let finish!: (value: any) => void;
  sdk.getPaywallProducts.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const loading = adapter.loadPaywall('in_app');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  live = { ...identity, userId: 'other', generation: 5 };
  finish([product('old.monthly', '$1')]);
  await expect(loading).rejects.toThrow('identity');
});

test('concurrent restore cannot overlap purchase or clear its busy flag', async () => {
  const { adapter, sdk } = setup();
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('in_app');
  let finish!: (value: any) => void;
  sdk.makePurchase.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const purchase = adapter.purchase(paywall.products[0]!.handle);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  await expect(adapter.restore()).rejects.toThrow('already running');
  expect(adapter.operation().busy).toBe(true);
  finish({ type: 'success', profile: profile(true) });
  await purchase;
});

test('disposed adapter cannot activate or serve a paywall', async () => {
  const { adapter, sdk } = setup();
  adapter.dispose();
  await expect(adapter.identify('uid')).rejects.toThrow('disposed');
  expect(sdk.activate).not.toHaveBeenCalled();
});

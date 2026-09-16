import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fallbackAsset from '../../../../assets/adapty-fallback.json';
import { AdaptySubscriptionAdapter } from '../AdaptySubscriptionAdapter';
import { ADAPTY_FALLBACK_ASSET_PATH, ADAPTY_FALLBACK_FILE_NAME } from '../fallbackPaywall';
import { entitlementStore } from '../../../state/entitlementStore';
import type { SubscriptionPaywall } from '../../../ports/SubscriptionPort';

const appNextRoot = resolve(__dirname, '../../../..');
const fallback = fallbackAsset as FallbackFile;

type FallbackFile = {
  meta: { version: number; developer_ids: string[]; response_created_at: number };
  data: Record<
    string,
    {
      meta: { placement: Record<string, unknown> };
      data: {
        variation_id: string;
        weight: number;
        flow_id: string;
        flow_name: string;
        remote_configs: { lang: string; data: string }[];
        variations: { paywall_id: string; products: { vendor_product_id: string; access_level_id: string; product_type: string }[] }[];
      }[];
    }
  >;
};
type FallbackPlacement = (typeof fallback)['data'][string];
type FallbackItem = FallbackPlacement['data'][number];
type FallbackReference = FallbackItem['variations'][number]['products'][number];

const identity = { kind: 'canonical' as const, userId: 'uid', isAnonymous: true, generation: 4, ready: true };
const profile = (active: boolean) => ({
  customerUserId: 'uid',
  profileId: 'p',
  accessLevels: { premium: { isActive: active, isLifetime: false, isInGracePeriod: false, willRenew: active } },
});

/**
 * Stands in for the native SDK's placement resolution: the network path fails
 * and the SDK serves the requested placement from the registered fallback file
 * (AdaptySDK-iOS `PlacementStorage.getPlacementWithFallback`). Everything the
 * fake serves comes from the committed asset, so the assertions below fail if
 * the asset stops being a usable fallback.
 */
function setupFallbackSdk() {
  const calls: string[] = [];
  let registered: string | null = null;
  const flowFor = (item: FallbackItem, placementId: string) => ({
    variationId: item.variation_id,
    remoteConfigs: item.remote_configs.map((config) => ({ lang: config.lang, data: JSON.parse(config.data) })),
    placement: { id: placementId },
  });
  const sdk = {
    activate: jest.fn(async () => {
      calls.push('activate');
    }),
    setFallback: jest.fn(async (location: { ios: { fileName: string } }) => {
      calls.push(`setFallback:${location.ios.fileName}`);
      registered = location.ios.fileName;
    }),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    identify: jest.fn(async () => {
      calls.push('identify');
    }),
    setIntegrationIdentifier: jest.fn(async () => {}),
    restorePurchases: jest.fn(async () => profile(true)),
    logout: jest.fn(async () => {}),
    getProfile: jest.fn(async () => profile(true)),
    getFlow: jest.fn(async (placementId: string) => {
      calls.push(`getFlow:${placementId}`);
      // Offline: the fetch fails, so only an already-registered fallback can answer.
      const placement = registered === ADAPTY_FALLBACK_FILE_NAME ? fallback.data[placementId] : undefined;
      if (!placement) throw new Error('placement could not load');
      return flowFor(placement.data[0]!, placementId);
    }),
    getPaywallProducts: jest.fn(async (flow: { variationId: string }) => {
      const item = Object.values(fallback.data)
        .flatMap((placement) => placement.data)
        .find((candidate) => candidate.variation_id === flow.variationId);
      return (item?.variations[0]?.products ?? []).map((product: FallbackReference) => ({
        vendorProductId: product.vendor_product_id,
        variationId: flow.variationId,
        localizedTitle: product.product_type === 'annual' ? 'Premium A Annual' : 'Premium A Monthly',
        localizedDescription: 'Unlocks ExcerLock Premium.',
        price: { localizedString: product.product_type === 'annual' ? '$59.99' : '$9.99' },
        subscription: { localizedSubscriptionPeriod: product.product_type, subscriptionPeriod: { unit: product.product_type, numberOfUnits: 1 } },
      }));
    }),
    logShowFlow: jest.fn(async () => {}),
    makePurchase: jest.fn(async () => {
      calls.push('purchase');
      return { type: 'success', profile: profile(true) };
    }),
  };
  const reportError = jest.fn();
  const adapter = new AdaptySubscriptionAdapter({
    sdk: sdk as never,
    publicSdkKey: 'public',
    getIdentity: () => identity,
    waitForIdentityReady: async () => identity,
    runIdentityOperation: async (operation) => operation(),
    getPosthogDistinctId: () => 'posthog-id',
    reportError,
    openSubscriptionManagement: jest.fn(async () => {}),
  });
  return { adapter, sdk, calls, reportError };
}

beforeEach(() => entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } }));

test('activation registers the bundled fallback file before the first placement load', async () => {
  const { adapter, sdk, calls } = setupFallbackSdk();
  await adapter.identify('uid');
  expect(sdk.setFallback).toHaveBeenCalledWith({ ios: { fileName: ADAPTY_FALLBACK_FILE_NAME } });
  await adapter.loadPaywall('onboarding');
  expect(calls).toEqual(['activate', `setFallback:${ADAPTY_FALLBACK_FILE_NAME}`, 'identify', 'getFlow:onboarding']);
});

test('a load failure with the fallback registered still yields a purchasable paywall view-model', async () => {
  const { adapter } = setupFallbackSdk();
  await adapter.identify('uid');
  const paywall = await adapter.loadPaywall('onboarding');
  expect(paywall.title).toBe('Choose your plan');
  expect(paywall.body).toBe('Build a healthier relationship with your phone.');
  expect(paywall.flowVariationId).toBe(fallback.data.onboarding!.data[0]!.variation_id);
  expect(paywall.products.map((product) => [product.vendorProductId, product.localizedPrice, product.recommended])).toEqual([
    ['com.johansardar.excerlock.premium.a.annual', '$59.99', true],
    ['com.johansardar.excerlock.premium.a.monthly', '$9.99', false],
  ]);
  await expect(adapter.purchase(paywall.products[0]!.handle)).resolves.toEqual(
    expect.objectContaining({ type: 'success' }),
  );
  expect(adapter.entitlement().status).toBe('active');
});

test('without the fallback registered the same offline load is reported, not swallowed', async () => {
  const { adapter, sdk, reportError } = setupFallbackSdk();
  sdk.setFallback.mockRejectedValueOnce(new Error('fallback file missing'));
  await adapter.identify('uid');
  await expect(adapter.loadPaywall('onboarding')).rejects.toThrow('placement could not load');
  expect(reportError).toHaveBeenCalledWith(expect.any(Error));
});

test.each(['onboarding', 'in_app', 'winback'] as const)('%s renders from the bundled fallback', async (placement) => {
  const { adapter } = setupFallbackSdk();
  await adapter.identify('uid');
  const paywall: SubscriptionPaywall = await adapter.loadPaywall(placement);
  const expected = fallback.data[placement]!.data[0]!.variations[0]!.products.map((product) => product.vendor_product_id);
  expect(paywall.products.map((product) => product.vendorProductId)).toEqual(expected);
  expect(paywall.products.every((product) => product.localizedPrice && product.localizedPeriod)).toBe(true);
});

describe('the committed asset is an SDK 4 fallback file', () => {
  it('declares the format version the SDK accepts', () => {
    // AdaptySDK-iOS 4.0.2 `Versions.fallbackFormatVersion`; a mismatch makes
    // setFallback throw `wrongVersionFallback` and silently drops the offline path.
    expect(fallback.meta.version).toBe(10);
    expect(fallback.meta.response_created_at).toBeGreaterThan(0);
  });

  it('covers every placement the client requests', () => {
    const requested: readonly SubscriptionPaywall['placement'][] = ['onboarding', 'in_app', 'winback'];
    expect(fallback.meta.developer_ids).toEqual(requested);
    for (const placement of requested) expect(fallback.data[placement]?.meta.placement.developer_id).toBe(placement);
  });

  it('carries flow, paywall and product references the SDK can resolve', () => {
    for (const [placement, entry] of Object.entries(fallback.data)) {
      const item = entry.data[0]!;
      expect(`${placement} variation_id: ${typeof item.variation_id}`).toBe(`${placement} variation_id: string`);
      expect(item.weight).toBe(100);
      const paywall = item.variations[0]!;
      expect(paywall.paywall_id).toBeTruthy();
      expect(paywall.products.length).toBeGreaterThan(0);
      for (const product of paywall.products) {
        expect(product.access_level_id).toBe('premium');
        expect(['annual', 'monthly']).toContain(product.product_type);
      }
    }
  });

  it('only references vendor products the local StoreKit catalog defines', () => {
    const storekit = readFileSync(resolve(appNextRoot, 'storekit', 'ExcerLock.storekit'), 'utf8');
    const vendorIds = Object.values(fallback.data).flatMap((entry) =>
      entry.data.flatMap((item) => item.variations.flatMap((paywall) => paywall.products.map((product) => product.vendor_product_id))),
    );
    expect(vendorIds.length).toBeGreaterThan(0);
    for (const vendorId of vendorIds) expect(storekit).toContain(`"productID": "${vendorId}"`);
  });

  it('ships the same file the Expo config plugin embeds', () => {
    const nativeConfig = readFileSync(resolve(appNextRoot, 'config', 'native.ts'), 'utf8');
    expect(nativeConfig).toContain(`"react-native-adapty", { fallbackFile: { ios: "${ADAPTY_FALLBACK_ASSET_PATH}" } }`);
    expect(ADAPTY_FALLBACK_FILE_NAME).toBe('adapty-fallback.json');
  });
});

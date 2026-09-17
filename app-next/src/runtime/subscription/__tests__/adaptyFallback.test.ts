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
      meta: { placement: { developer_id: string; audience_name?: string } };
      data: {
        variation_id: string;
        variation_name: string;
        weight: number;
        flow_id: string;
        flow_name: string;
        remote_configs: { lang: string; data: string }[];
        variations: {
          paywall_id: string;
          placement_id: string;
          products: { vendor_product_id: string; access_level_id: string; product_type: string; title?: string }[];
        }[];
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
  expect(paywall.title).toBe('Unlock ExcerLock Premium');
  expect(paywall.body).toBe('Your apps stay locked until you move. Pick a plan to start.');
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
    // The dashboard writes its own order (`in_app`, `onboarding`, `winback`), so
    // compare as a set instead of pinning an order the export does not promise.
    expect([...fallback.meta.developer_ids].sort()).toEqual([...requested].sort());
    for (const placement of requested) expect(fallback.data[placement]?.meta.placement.developer_id).toBe(placement);
  });

  // Exact ids from the 2026-09-17 dashboard export; a refresh replaces these
  // numbers (see README.md) and this table with it.
  const dashboardPlacements: Record<
    SubscriptionPaywall['placement'],
    { placementId: string; paywallId: string; flowName: string; title: string; body: string; recommendedProductId: string }
  > = {
    in_app: {
      placementId: 'beb86e0e-63a6-40c3-ab65-100b157b8de6',
      paywallId: 'f3933bd1-d481-4359-a336-2fb11e35a04c',
      flowName: 'Premium A',
      title: 'Unlock ExcerLock Premium',
      body: 'Your apps stay locked until you move. Pick a plan to start.',
      recommendedProductId: 'com.johansardar.excerlock.premium.a.annual',
    },
    onboarding: {
      placementId: '29524927-9f2f-4dc0-a56a-ce59c6876c4b',
      paywallId: 'f3933bd1-d481-4359-a336-2fb11e35a04c',
      flowName: 'Premium A',
      title: 'Unlock ExcerLock Premium',
      body: 'Your apps stay locked until you move. Pick a plan to start.',
      recommendedProductId: 'com.johansardar.excerlock.premium.a.annual',
    },
    winback: {
      placementId: '55351edf-8467-4d8a-8780-d9731151f05e',
      paywallId: '14ae444b-4d90-4b27-b853-52eafdb66318',
      flowName: 'Win-back A',
      title: 'Come back to ExcerLock Premium',
      body: 'Your special return offer. Your apps stay locked until you move.',
      recommendedProductId: 'com.johansardar.excerlock.premium.a.winback.annual',
    },
  };

  it('carries the dashboard export placement ids, flows and paywalls', () => {
    for (const [placement, expected] of Object.entries(dashboardPlacements)) {
      const entry = fallback.data[placement]!;
      const item = entry.data[0]!;
      const paywall = item.variations[0]!;
      expect({ placement: entry.meta.placement.developer_id, id: paywall.placement_id }).toEqual({
        placement,
        id: expected.placementId,
      });
      expect(item.flow_name).toBe(expected.flowName);
      expect(paywall.paywall_id).toBe(expected.paywallId);
    }
  });

  it('embeds the live remote config for every placement', () => {
    for (const [placement, expected] of Object.entries(dashboardPlacements)) {
      const configs = fallback.data[placement]!.data[0]!.remote_configs;
      expect(`${placement} remote_configs: ${configs.length}`).toBe(`${placement} remote_configs: 1`);
      expect(configs[0]!.lang).toBe('en');
      expect(JSON.parse(configs[0]!.data)).toEqual({
        title: expected.title,
        body: expected.body,
        recommendedProductId: expected.recommendedProductId,
      });
    }
  });

  it('uses the real dashboard vendor product ids per placement', () => {
    const expected: Record<SubscriptionPaywall['placement'], string[]> = {
      in_app: [
        'com.johansardar.excerlock.premium.a.annual',
        'com.johansardar.excerlock.premium.a.monthly',
      ],
      onboarding: [
        'com.johansardar.excerlock.premium.a.annual',
        'com.johansardar.excerlock.premium.a.monthly',
      ],
      winback: ['com.johansardar.excerlock.premium.a.winback.annual'],
    };
    for (const [placement, vendorIds] of Object.entries(expected)) {
      const products = fallback.data[placement]!.data[0]!.variations[0]!.products;
      expect(products.map((product) => product.vendor_product_id)).toEqual(vendorIds);
      // The remote config recommends a plan this same placement actually carries.
      expect(vendorIds).toContain(dashboardPlacements[placement as SubscriptionPaywall['placement']].recommendedProductId);
    }
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

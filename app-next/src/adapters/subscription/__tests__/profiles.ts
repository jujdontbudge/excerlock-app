import type { AdaptyAccessLevel, AdaptyPaywallProduct, AdaptyProfile } from 'react-native-adapty';

/** Adapty profile builders: only the fields the entitlement mapping reads are meaningful. */
export const accessLevel = (patch: Partial<AdaptyAccessLevel> = {}): AdaptyAccessLevel =>
  ({
    id: 'premium',
    activatedAt: new Date('2026-09-01T15:00:00.000Z'),
    isActive: true,
    isInGracePeriod: false,
    isLifetime: false,
    isRefund: false,
    store: 'app_store',
    vendorProductId: 'com.johansardar.excerlock.premium.a.annual',
    willRenew: true,
    ...patch,
  }) as AdaptyAccessLevel;

export const profile = (levels: Record<string, AdaptyAccessLevel> | undefined = undefined): AdaptyProfile =>
  ({ profileId: 'adapty-profile', customerUserId: 'supabase-uid', accessLevels: levels }) as AdaptyProfile;

export const premium = (patch: Partial<AdaptyAccessLevel> = {}): AdaptyProfile =>
  profile({ premium: accessLevel(patch) });

export const annualProduct = (patch: Partial<AdaptyPaywallProduct> = {}): AdaptyPaywallProduct =>
  ({
    vendorProductId: 'com.johansardar.excerlock.premium.a.annual',
    localizedTitle: 'Annual',
    localizedDescription: '7 days free, then $59.99 per year',
    price: { amount: 59.99, currencyCode: 'USD', currencySymbol: '$', localizedString: '$59.99' },
    subscription: {
      subscriptionPeriod: { numberOfUnits: 1, unit: 'year' },
      localizedSubscriptionPeriod: 'year',
      offer: {
        identifier: { id: 'intro', type: 'introductory' },
        phases: [
          {
            numberOfPeriods: 1,
            paymentMode: 'free_trial',
            subscriptionPeriod: { numberOfUnits: 7, unit: 'day' },
            price: { amount: 0, currencyCode: 'USD', currencySymbol: '$', localizedString: '$0.00' },
          },
        ],
      },
    },
    ...patch,
  }) as AdaptyPaywallProduct;

export const monthlyProduct = (): AdaptyPaywallProduct =>
  ({
    vendorProductId: 'com.johansardar.excerlock.premium.a.monthly',
    localizedTitle: 'Monthly',
    localizedDescription: 'Billed monthly',
    price: { amount: 9.99, currencyCode: 'USD', currencySymbol: '$', localizedString: '$9.99' },
    subscription: {
      subscriptionPeriod: { numberOfUnits: 1, unit: 'month' },
      localizedSubscriptionPeriod: 'month',
    },
  }) as AdaptyPaywallProduct;

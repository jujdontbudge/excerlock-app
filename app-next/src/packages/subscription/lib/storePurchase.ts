import type { StorePurchase } from '../../ports/SubscriptionPort';
import type { AdaptyProfile } from '../adaptySdk';

export function storePurchaseForProfile(profile: AdaptyProfile, productId?: string): StorePurchase | undefined {
  const purchases = Object.values(profile.subscriptions ?? {}).filter((purchase) =>
    purchase.isActive && purchase.store === 'app_store' && purchase.vendorOriginalTransactionId &&
    (!productId || purchase.vendorProductId === productId),
  );
  if (purchases.length !== 1) return undefined;
  return { originalTransactionId: purchases[0]!.vendorOriginalTransactionId, isSandbox: purchases[0]!.isSandbox };
}

export function profileContainsPurchase(profile: AdaptyProfile, purchase: StorePurchase): boolean {
  return Object.values(profile.subscriptions ?? {}).some((subscription) => subscription.isActive &&
    subscription.store === 'app_store' && subscription.vendorOriginalTransactionId === purchase.originalTransactionId &&
    subscription.isSandbox === purchase.isSandbox);
}

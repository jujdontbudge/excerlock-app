import type { StorePurchase } from '../../ports/SubscriptionPort';
import type { AdaptyProfile } from '../adaptySdk';
import type { StoreTransaction } from './purchaseConversion';

export function storePurchaseForTransaction(transaction: StoreTransaction | null): StorePurchase | undefined {
  if (!transaction?.originalTransactionId || !['Production', 'Sandbox'].includes(transaction.environment ?? '')) return undefined;
  return { originalTransactionId: transaction.originalTransactionId, isSandbox: transaction.environment === 'Sandbox' };
}

export function storePurchaseForProfile(profile: AdaptyProfile, productId?: string): StorePurchase | undefined {
  const purchases = Object.values(profile.subscriptions ?? {}).filter((purchase) =>
    purchase.isActive && purchase.store === 'app_store' && purchase.vendorOriginalTransactionId &&
    (!productId || purchase.vendorProductId === productId),
  );
  if (purchases.length !== 1) return undefined;
  return { originalTransactionId: purchases[0]!.vendorOriginalTransactionId, isSandbox: purchases[0]!.isSandbox };
}

export function profileHasActiveStoreProduct(profile: AdaptyProfile, productId: string): boolean {
  const access = profile.accessLevels?.premium;
  return Object.values(profile.subscriptions ?? {}).some((purchase) =>
    purchase.isActive && purchase.store === 'app_store' && purchase.vendorProductId === productId,
  ) || (access?.isActive === true && access.store === 'app_store' && access.vendorProductId === productId);
}

export function profileContainsPurchase(profile: AdaptyProfile, purchase: StorePurchase): boolean {
  return Object.values(profile.subscriptions ?? {}).some((subscription) => subscription.isActive &&
    subscription.store === 'app_store' && subscription.vendorOriginalTransactionId === purchase.originalTransactionId &&
    subscription.isSandbox === purchase.isSandbox);
}

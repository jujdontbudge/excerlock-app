import type { AdConversion, AdStoreEnvironment } from '../../ports/AdAttributionPort';

export type StoreTransaction = {
  originalTransactionId?: string;
  productId?: string;
  offerType?: number;
  offerDiscountType?: string;
  transactionReason?: string;
  price?: number;
  currency?: string;
  environment?: string;
};

export type PremiumAccess = {
  isActive: boolean;
  vendorProductId?: string;
  activeIntroductoryOfferType?: string;
};

export type PurchaseConversion = { kind: 'trial' | 'subscription'; conversion: AdConversion };

const APPLE_INTRODUCTORY_OFFER = 1;

export function decodeStoreTransaction(jws: string | undefined): StoreTransaction | null {
  const payload = jws?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const value: unknown = JSON.parse(atob(base64));
    if (!value || typeof value !== 'object') return null;
    const field = (key: string) => (value as Record<string, unknown>)[key];
    const text = (key: string) => (typeof field(key) === 'string' ? (field(key) as string) : undefined);
    const number = (key: string) => (typeof field(key) === 'number' ? (field(key) as number) : undefined);
    return {
      originalTransactionId: text('originalTransactionId'),
      productId: text('productId'),
      offerType: number('offerType'),
      offerDiscountType: text('offerDiscountType'),
      transactionReason: text('transactionReason'),
      price: number('price'),
      currency: text('currency'),
      environment: text('environment'),
    };
  } catch {
    return null;
  }
}

const storeEnvironment = (value: string | undefined): AdStoreEnvironment =>
  value === 'Production' ? 'production' : value === 'Sandbox' ? 'sandbox' : value === 'Xcode' ? 'xcode' : 'unknown';

export function classifyPurchase(input: {
  account: string;
  access: PremiumAccess | undefined;
  transaction: StoreTransaction | null;
  product: { vendorProductId: string; amount: number | undefined; currency: string | undefined };
  hadAccessBefore: boolean;
}): PurchaseConversion | null {
  const { access, transaction, product } = input;
  if (!access?.isActive || input.hadAccessBefore) return null;
  if (access.vendorProductId && access.vendorProductId !== product.vendorProductId) return null;
  if (transaction?.productId && transaction.productId !== product.vendorProductId) return null;
  if (transaction?.transactionReason && transaction.transactionReason !== 'PURCHASE') return null;
  const trial = transaction
    ? transaction.offerType === APPLE_INTRODUCTORY_OFFER && transaction.offerDiscountType === 'FREE_TRIAL'
    : access.activeIntroductoryOfferType === 'free_trial';
  const paidPrice = transaction?.price !== undefined && transaction.currency ? transaction.price / 1000 : undefined;
  const value = paidPrice ?? product.amount ?? 0;
  const currency = (paidPrice !== undefined ? transaction?.currency : product.currency) ?? '';
  if (!trial && (!(value > 0) || !/^[A-Z]{3}$/.test(currency))) return null;
  return {
    kind: trial ? 'trial' : 'subscription',
    conversion: {
      account: input.account,
      originalTransaction: transaction?.originalTransactionId ?? null,
      value: trial ? 0 : value,
      currency,
      storeEnvironment: storeEnvironment(transaction?.environment),
    },
  };
}

import type { StoreReviewOutcome, StoreReviewPort } from '../../ports/StoreReviewPort';

export interface StoreReviewNative {
  isAvailableAsync?(): Promise<boolean>;
  requestReview?(): Promise<void>;
}

export function createStoreReviewPort(storeKit: StoreReviewNative): StoreReviewPort {
  return {
    isAvailable: async () => {
      if (typeof storeKit.isAvailableAsync !== 'function') return false;
      try {
        return (await storeKit.isAvailableAsync()) === true;
      } catch {
        return false;
      }
    },
    requestReview: async (): Promise<StoreReviewOutcome> => {
      if (typeof storeKit.requestReview !== 'function') return 'failed';
      try {
        await storeKit.requestReview();
        return 'requested';
      } catch {
        return 'failed';
      }
    },
  };
}

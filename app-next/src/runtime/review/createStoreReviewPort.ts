import type { StoreReviewOutcome, StoreReviewPort } from '../../ports/StoreReviewPort';

/** The slice of `expo-store-review` the port needs (ExpoStoreReview pod, linked in the binary). */
export interface StoreReviewNative {
  isAvailableAsync?(): Promise<boolean>;
  requestReview?(): Promise<void>;
}

/**
 * Thin, side-effect-honest wrapper over StoreKit's `AppStore.requestReview(in:)`.
 * There is no custom UI here and nothing decides *when* to ask; that policy
 * lives in JS and can move with an OTA. The binary only has to carry the call.
 */
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

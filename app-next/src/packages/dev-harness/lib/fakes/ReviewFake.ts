import type { StoreReviewPort } from '../../../ports/StoreReviewPort';
import type { FakeContext } from '../FakeContext';
export function ReviewFake(ctx: FakeContext, nativeReview?: StoreReviewPort): StoreReviewPort {
  return {
    isAvailable: async () => true,
    requestReview: async () => {
      ctx.log('review_requested');
      if (ctx.snapshot().promptMode === 'ask' && nativeReview) {
        const outcome = await nativeReview.requestReview();
        ctx.log('native_review_outcome', { outcome });
        return outcome;
      }
      return 'requested';
    },
  };
}

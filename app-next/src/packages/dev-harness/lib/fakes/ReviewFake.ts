import type { StoreReviewPort } from '../../../ports/StoreReviewPort';
import type { FakeContext } from '../FakeContext';
export function ReviewFake(ctx: FakeContext): StoreReviewPort {
  return {
    isAvailable: async () => true,
    requestReview: async () => {
      ctx.log('review_requested');
      return 'requested';
    },
  };
}

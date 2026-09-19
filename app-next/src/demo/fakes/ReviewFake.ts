import type { StoreReviewPort } from '../../ports/StoreReviewPort';
import type { FakeContext } from '../FakeContext';
/** No sheet in the fake runtime; the request is logged so the dev menu shows it happened. */
export function ReviewFake(ctx: FakeContext): StoreReviewPort {
  return {
    isAvailable: async () => true,
    requestReview: async () => {
      ctx.log('review_requested');
      return 'requested';
    },
  };
}

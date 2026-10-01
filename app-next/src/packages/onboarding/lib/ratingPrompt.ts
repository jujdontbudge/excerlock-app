import type { StoreReviewPort } from '../../ports/StoreReviewPort';

let claiming = false;

export async function requestOnboardingRating(review: StoreReviewPort, active: () => boolean) {
  if (!active() || claiming) return;
  claiming = true;
  try {
    if (await review.isAvailable() && active()) await review.requestReview();
  } catch {
  } finally {
    claiming = false;
  }
}

import { createPersistedStore } from '../../persistence/createPersistedStore';
import { bool } from '../../persistence/validation';
import type { StoreReviewPort } from '../../ports/StoreReviewPort';

const ratingPromptStore = createPersistedStore('onboarding-rating-prompt', { requested: false }, { requested: bool });
let claiming = false;

export async function requestOnboardingRating(review: StoreReviewPort, active: () => boolean) {
  if (!ratingPromptStore.persist.hasHydrated()) await ratingPromptStore.persist.rehydrate();
  if (!active() || claiming || ratingPromptStore.getState().data.requested) return;
  claiming = true;
  try {
    if (!await review.isAvailable() || !active()) return;
    ratingPromptStore.getState().patch({ requested: true });
    await ratingPromptStore.persistBarrier();
    if (active()) await review.requestReview();
  } catch {
  } finally {
    claiming = false;
  }
}

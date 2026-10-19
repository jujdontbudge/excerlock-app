import { AppState } from 'react-native';
import type { StoreReviewPort } from '../../ports/StoreReviewPort';
import { tokens as t } from '../../ui/tokens';

const whenActive = (run: () => void) => {
  if (AppState.currentState === 'active') return run();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    subscription.remove();
    setTimeout(run, t.motion.ratingPromptDelay);
  });
};

export function requestReviewAfterCreate(review: StoreReviewPort) {
  const ask = (retries: number) =>
    whenActive(() => {
      void review.requestReview().then((outcome) => {
        if (outcome === 'failed' && retries > 0) ask(retries - 1);
      });
    });
  setTimeout(() => ask(1), t.motion.ratingPromptDelay);
}

import { reviewFacts, reviewPromptDecision, ReviewStage } from '../../domain/reviewPrompt';
import { dayKey } from '../../domain/calendar';
import { Unsubscribe } from '../../ports/models';
import { reviewStore } from '../../state/reviewStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { Runtime } from '../../runtime/Runtime';
import { nativeStoreReview, StoreReviewModule } from './nativeReview';

const sources: Record<ReviewStage, string> = { metDays: 'unlock_moment', streak7: 'streak_7', streak30: 'streak_30' };

/**
 * Runs the rating policy whenever the rule days change: a day becoming met is the product moment the
 * PRD prompts on. The prompt is claimed in the store before the native call, so a second store write
 * during the sheet cannot present the same stage twice; iOS still decides whether to actually show it.
 */
export function startReviewPrompts(
  runtime: Pick<Runtime, 'clock' | 'analytics'>,
  native: StoreReviewModule = nativeStoreReview,
): Unsubscribe {
  let active = true,
    queue = Promise.resolve();
  const check = async () => {
    if (!active) return;
    const now = runtime.clock.now();
    const state = reviewStore.getState();
    if (state.data.installedAt === null) state.patch({ installedAt: now });
    const facts = reviewFacts(
      rulesStore.getState().data.rules,
      ruleDaysStore.getState().data.days,
      dayKey(now, runtime.clock.timezone()),
      runtime.clock.timezone(),
    );
    const decision = reviewPromptDecision(reviewStore.getState().data, facts, now);
    if (!decision.show || !(await native.isAvailable()) || !active) return;
    reviewStore.getState().patch({ promptCount: reviewStore.getState().data.promptCount + 1 });
    runtime.analytics.track('rating_prompt_shown', { source: sources[decision.stage] });
    await native.requestReview();
  };
  const schedule = () => {
    queue = queue.then(check).catch(() => {});
  };
  schedule();
  const stop = ruleDaysStore.subscribe(schedule);
  return () => {
    active = false;
    stop();
  };
}

/** The Settings Rate row: opens the review composer and ends the automatic prompts for good. */
export async function rateManually(
  runtime: Pick<Runtime, 'analytics'>,
  native: StoreReviewModule = nativeStoreReview,
): Promise<void> {
  reviewStore.getState().patch({ manualRateTapped: true });
  await native.openWriteReview();
  runtime.analytics.track('rating_prompt_shown', { source: 'settings' });
}

import { analytics, type AnalyticsKit } from "@/analytics";

import { nativeReviewModule, type NativeReviewModule } from "./nativeReview";
import {
  reviewPromptDecision,
  type ReviewPromptTrigger,
} from "./policy";
import { useReviewPromptStore } from "./reviewStore";

export interface ReviewCoordinatorContract {
  onUnlockMoment: (atMs: number) => Promise<boolean>;
  onStreakMilestone: (days: number, atMs: number) => Promise<boolean>;
  noteShieldShown: (atMs: number) => Promise<void>;
  manualRate: () => Promise<boolean>;
}

export class ReviewCoordinator implements ReviewCoordinatorContract {
  private hydration: Promise<void> | undefined;

  public constructor(
    private readonly native: NativeReviewModule = nativeReviewModule,
    private readonly analyticsKit: AnalyticsKit = analytics,
  ) {}

  public async onUnlockMoment(atMs: number): Promise<boolean> {
    await this.prepare(atMs);
    useReviewPromptStore.getState().recordUnlockMoment();
    return this.maybePrompt({ kind: "unlockMoment" }, atMs);
  }

  public async onStreakMilestone(days: number, atMs: number): Promise<boolean> {
    await this.prepare(atMs);
    return this.maybePrompt({ kind: "streak", days }, atMs);
  }

  public async noteShieldShown(atMs: number): Promise<void> {
    await this.prepare(atMs);
    useReviewPromptStore.getState().recordShieldShown(atMs);
  }

  public async manualRate(): Promise<boolean> {
    await this.hydrate();
    useReviewPromptStore.getState().recordManualRateTap();
    const opened = await this.native.openWriteReviewPage();
    if (opened) this.analyticsKit.track("rating_prompt_shown", { source: "settings" });
    return opened;
  }

  private async maybePrompt(trigger: ReviewPromptTrigger, atMs: number): Promise<boolean> {
    const decision = reviewPromptDecision(useReviewPromptStore.getState(), trigger, atMs);
    if (!decision.show || !(await this.native.isAvailable())) return false;

    // Claim before crossing the async native boundary so concurrent observers
    // cannot present the same stage twice.
    useReviewPromptStore.getState().recordPromptShown();
    this.analyticsKit.track("rating_prompt_shown", { source: "unlock_moment" });
    await this.native.requestReview();
    return true;
  }

  private async prepare(atMs: number): Promise<void> {
    await this.hydrate();
    useReviewPromptStore.getState().ensureInstallTimestamp(atMs);
  }

  private hydrate(): Promise<void> {
    if (this.hydration === undefined) {
      this.hydration = Promise.resolve(useReviewPromptStore.persist.rehydrate());
    }
    return this.hydration;
  }
}

export const reviewCoordinator = new ReviewCoordinator();

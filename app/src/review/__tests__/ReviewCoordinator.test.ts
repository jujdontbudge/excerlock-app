jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { createAnalyticsKit, noopSink } from "@/analytics";

import { ReviewCoordinator } from "../ReviewCoordinator";
import { DEFAULT_REVIEW_PROMPT_STATE, useReviewPromptStore } from "../reviewStore";

const NOW = Date.UTC(2026, 6, 31, 12);

describe("ReviewCoordinator", () => {
  beforeEach(() => {
    useReviewPromptStore.setState(DEFAULT_REVIEW_PROMPT_STATE);
  });

  it("records install age when the app first initializes, before any unlock", async () => {
    const coordinator = new ReviewCoordinator(
      {
        isAvailable: async () => true,
        requestReview: async () => {},
        openWriteReviewPage: async () => true,
      },
      createAnalyticsKit(noopSink),
    );

    await coordinator.initialize(NOW);

    expect(useReviewPromptStore.getState().installedAtMs).toBe(NOW);
    expect(useReviewPromptStore.getState().unlockMomentCount).toBe(0);
  });
});

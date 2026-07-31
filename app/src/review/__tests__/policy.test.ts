import { reviewPromptDecision, type ReviewPromptState } from "../policy";

const DAY_MS = 86_400_000;
const NOW = 10 * DAY_MS;

function state(overrides: Partial<ReviewPromptState> = {}): ReviewPromptState {
  return {
    installedAtMs: NOW - 4 * DAY_MS,
    unlockMomentCount: 5,
    promptCount: 0,
    manualRateTapped: false,
    lastShieldShownAtMs: null,
    ...overrides,
  };
}

describe("reviewPromptDecision", () => {
  it("orders the three prompts at the fifth unlock, 7-day streak, and 30-day streak", () => {
    expect(reviewPromptDecision(state(), { kind: "unlockMoment" }, NOW)).toEqual({
      show: true,
      source: "unlock_moment",
    });
    expect(
      reviewPromptDecision(state({ promptCount: 1 }), { kind: "streak", days: 7 }, NOW),
    ).toEqual({ show: true, source: "streak_7" });
    expect(
      reviewPromptDecision(state({ promptCount: 2 }), { kind: "streak", days: 30 }, NOW),
    ).toEqual({ show: true, source: "streak_30" });
  });

  it("waits for three install days and five unlock moments before the first prompt", () => {
    expect(
      reviewPromptDecision(state({ installedAtMs: NOW - 2 * DAY_MS }), { kind: "unlockMoment" }, NOW),
    ).toEqual({ show: false });
    expect(
      reviewPromptDecision(state({ unlockMomentCount: 4 }), { kind: "unlockMoment" }, NOW),
    ).toEqual({ show: false });
  });

  it("suppresses prompts for 30 minutes after shields become active", () => {
    expect(
      reviewPromptDecision(
        state({ lastShieldShownAtMs: NOW - 29 * 60_000 }),
        { kind: "unlockMoment" },
        NOW,
      ),
    ).toEqual({ show: false });
  });

  it("stops after three prompts or a manual Rate tap", () => {
    expect(
      reviewPromptDecision(state({ promptCount: 3 }), { kind: "streak", days: 30 }, NOW),
    ).toEqual({ show: false });
    expect(
      reviewPromptDecision(state({ manualRateTapped: true }), { kind: "unlockMoment" }, NOW),
    ).toEqual({ show: false });
  });
});

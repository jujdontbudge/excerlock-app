export interface ReviewPromptState {
  readonly installedAtMs: number | null;
  readonly unlockMomentCount: number;
  readonly promptCount: number;
  readonly manualRateTapped: boolean;
  readonly lastShieldShownAtMs: number | null;
}

export type ReviewPromptTrigger =
  | { readonly kind: "unlockMoment" }
  | { readonly kind: "streak"; readonly days: number };

export type ReviewPromptSource = "unlock_moment" | "streak_7" | "streak_30";
export type ReviewPromptDecision =
  | { readonly show: false }
  | { readonly show: true; readonly source: ReviewPromptSource };

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1_000;
const SHIELD_COOLDOWN_MS = 30 * 60 * 1_000;

/** PRD §8's ordered, local-only rating policy. */
export function reviewPromptDecision(
  state: ReviewPromptState,
  trigger: ReviewPromptTrigger,
  atMs: number,
): ReviewPromptDecision {
  if (
    state.manualRateTapped ||
    state.promptCount >= 3 ||
    state.installedAtMs === null ||
    (state.lastShieldShownAtMs !== null &&
      atMs - state.lastShieldShownAtMs < SHIELD_COOLDOWN_MS)
  ) {
    return { show: false };
  }

  if (state.promptCount === 0) {
    return trigger.kind === "unlockMoment" &&
      state.unlockMomentCount >= 5 &&
      atMs - state.installedAtMs >= THREE_DAYS_MS
      ? { show: true, source: "unlock_moment" }
      : { show: false };
  }
  if (state.promptCount === 1) {
    return trigger.kind === "streak" && trigger.days >= 7
      ? { show: true, source: "streak_7" }
      : { show: false };
  }
  return trigger.kind === "streak" && trigger.days >= 30
    ? { show: true, source: "streak_30" }
    : { show: false };
}

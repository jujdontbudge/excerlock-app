import type {
  CurrentShieldState,
  LockWindow,
  ScreenTimeSelectionSummary,
} from "@/screentime";

import { formatWallClockTime } from "./wallClock";

export type LockStatus = "unlocked" | "locked" | "unconfigured";

/** The current-lock-state surface: what is shielded, why, and when it flips. */
export interface LockStatusModel {
  readonly status: LockStatus;
  /** What is shielded right now — always the boundary's own display line. */
  readonly scope: string;
  readonly headline: string;
  readonly reason: string;
  readonly nextChange: string;
}

export interface LockStatusInput {
  /** `null` until the boundary's first snapshot has arrived. */
  readonly shield: CurrentShieldState | null;
  readonly lockWindows: readonly LockWindow[];
  readonly selection: ScreenTimeSelectionSummary | null;
  readonly fullLock: boolean;
  /** Local wall-clock ms. Nothing in this module reads a clock itself. */
  readonly atMs: number;
}

const UNCONFIGURED: LockStatusModel = Object.freeze({
  status: "unconfigured",
  scope: "No apps chosen yet",
  headline: "Pick what ExcerLock can pause.",
  reason: "Nothing is shielded until you choose an app group.",
  nextChange: "Choose your apps to start.",
});

/**
 * Renders the observed shield state as the four cause-keyed lock states of PRD
 * §8. It decides nothing: whether shields are up is the boundary's answer, and
 * why they are up is read off the cause the boundary and the allowance report.
 */
export function deriveLockStatus({
  shield,
  lockWindows,
  selection,
  fullLock,
  atMs,
}: LockStatusInput): LockStatusModel {
  if (shield === null || selection === null) {
    return UNCONFIGURED;
  }

  const scope = selection.displayName;
  if (shield.effectiveShields === "down") {
    return Object.freeze({
      status: "unlocked" as const,
      scope,
      headline: "Your apps are open.",
      reason: fullLock
        ? "Full Lock is on, and you have already earned today."
        : "You have time left on today's balance.",
      nextChange: nextWindowLabel(lockWindows, atMs),
    });
  }

  return Object.freeze({
    status: "locked" as const,
    scope,
    ...lockedCause({ shield, lockWindows, fullLock }),
  });
}

function lockedCause({
  shield,
  lockWindows,
  fullLock,
}: {
  shield: CurrentShieldState;
  lockWindows: readonly LockWindow[];
  fullLock: boolean;
}): Pick<LockStatusModel, "headline" | "reason" | "nextChange"> {
  if (shield.activeLockWindowId !== null) {
    const active = lockWindows.find(
      ({ id }) => id === shield.activeLockWindowId,
    );
    return {
      headline: "Apps are asleep.",
      reason: "A lock window is running.",
      nextChange:
        active === undefined
          ? "When the lock window ends."
          : `Back at ${formatWallClockTime(active.endsAtMs)}.`,
    };
  }

  if (fullLock) {
    return {
      headline: "Move first, scroll after.",
      reason: "Full Lock is on — your day starts at zero.",
      nextChange: "Your first earn today opens them.",
    };
  }

  return {
    headline: "Time's up — for now.",
    reason: "Today's balance is empty.",
    nextChange: "Earn more time to open them.",
  };
}

function nextWindowLabel(
  lockWindows: readonly LockWindow[],
  atMs: number,
): string {
  const next = lockWindows
    .filter(({ startsAtMs }) => startsAtMs > atMs)
    .sort((left, right) => left.startsAtMs - right.startsAtMs)[0];
  return next === undefined
    ? "Nothing is scheduled to lock them."
    : `They sleep at ${formatWallClockTime(next.startsAtMs)}.`;
}

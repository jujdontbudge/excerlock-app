export interface LockPrecedenceInput {
  /** Today's spendable balance after every earn and drain through this instant. */
  readonly earnedBalanceMinutes: number;
  /**
   * `null` means no schedule exists and the economy applies all day. `false`
   * means a schedule exists but the user is currently outside every window.
   */
  readonly activeWindow: boolean | null;
  /** Full Lock is still the Home-owned base allowance being zero. */
  readonly fullLock: boolean;
  /** A currently verified Walk & Scroll session. */
  readonly walking: boolean;
}

export type LockPrecedenceCause =
  | "walking"
  | "outsideWindow"
  | "earnedBalance"
  | "fullLock"
  | "activeWindow"
  | "emptyBalance";

export interface LockPrecedenceDecision {
  readonly shields: "up" | "down";
  /** Walking is full price, but there is nothing to drain once balance is zero. */
  readonly drainsBalance: boolean;
  readonly cause: LockPrecedenceCause;
}

/**
 * The complete conflict policy for balance, schedules, Full Lock, and walking.
 *
 * Walking wins first. A configured schedule limits when the economy applies,
 * so outside it there is no shielding or draining. Inside it (or when there is
 * no schedule), remaining balance opens the apps. Full Lock is only the
 * zero-base explanation: an earn still opens the apps exactly as the PRD says.
 */
export function resolveLockPrecedence({
  earnedBalanceMinutes,
  activeWindow,
  fullLock,
  walking,
}: LockPrecedenceInput): LockPrecedenceDecision {
  const drainsBalance = earnedBalanceMinutes > 0;

  if (walking) {
    return { shields: "down", drainsBalance, cause: "walking" };
  }
  if (activeWindow === false) {
    return {
      shields: "down",
      drainsBalance: false,
      cause: "outsideWindow",
    };
  }
  if (drainsBalance) {
    return {
      shields: "down",
      drainsBalance: true,
      cause: "earnedBalance",
    };
  }
  if (fullLock) {
    return {
      shields: "up",
      drainsBalance: false,
      cause: "fullLock",
    };
  }
  return {
    shields: "up",
    drainsBalance: false,
    cause: activeWindow === true ? "activeWindow" : "emptyBalance",
  };
}

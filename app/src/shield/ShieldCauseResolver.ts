import type { LockPrecedenceDecision } from "@/lock/model/lockPrecedence";

import type { ShieldCause } from "./ShieldContentPublisher";

/** Remembers the one cause (`walking` ended) that is a transition, not a state. */
export class ShieldCauseResolver {
  private walkingWasActive = false;
  private latchedCause: ShieldCause | null = null;

  public resolve(
    decision: LockPrecedenceDecision,
    walking: boolean,
  ): ShieldCause | null {
    if (decision.shields === "down") {
      this.walkingWasActive = walking;
      this.latchedCause = null;
      return null;
    }

    if (this.walkingWasActive) {
      this.walkingWasActive = false;
      return (this.latchedCause = "walkAndScrollEnded");
    }
    if (decision.cause === "fullLock") {
      this.walkingWasActive = false;
      return (this.latchedCause = "fullLock");
    }
    if (decision.cause === "activeWindow") {
      this.walkingWasActive = false;
      return (this.latchedCause = "lockWindow");
    }
    if (this.latchedCause === "walkAndScrollEnded") {
      return this.latchedCause;
    }
    return (this.latchedCause = "balanceEmpty");
  }
}

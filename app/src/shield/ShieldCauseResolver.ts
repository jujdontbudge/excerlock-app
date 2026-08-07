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
      // The OS can still shield on its own (lease lapse, final drain rung,
      // window start) while the app is backgrounded or dead. Predict what
      // that shield should say so the app group never holds stale content
      // (device-smoke Finding 10).
      return predictedNativeCause(decision);
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

/** The shield the OS would apply next, given why the shields are open now. */
function predictedNativeCause(
  decision: LockPrecedenceDecision,
): ShieldCause | null {
  switch (decision.cause) {
    case "walking":
      return "walkAndScrollEnded";
    case "outsideWindow":
      return "lockWindow";
    case "earnedBalance":
      return "balanceEmpty";
    default:
      return null;
  }
}

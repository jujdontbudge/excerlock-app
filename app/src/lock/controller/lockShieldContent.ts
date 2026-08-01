import { ShieldCauseResolver } from "@/shield/ShieldCauseResolver";
import type { ShieldOfferContext } from "@/shield/ShieldContentCoordinator";
import type { ShieldCause } from "@/shield/ShieldContentPublisher";
import { getShieldContentCoordinator } from "@/shield/shieldContentRuntime";

import type { LockPrecedenceDecision } from "../model/lockPrecedence";

export interface ShieldContentSink {
  publish(cause: ShieldCause, context?: ShieldOfferContext): Promise<void>;
}

/** Keeps cause history and extension publishing out of lock orchestration. */
export class LockShieldContent {
  private readonly causeResolver = new ShieldCauseResolver();

  public constructor(
    private readonly sink: ShieldContentSink = getShieldContentCoordinator(),
  ) {}

  public async publish(
    decision: LockPrecedenceDecision,
    walking: boolean,
    lockWindowEndsAtMs?: number,
  ): Promise<void> {
    const cause = this.causeResolver.resolve(decision, walking);
    if (cause !== null) {
      await this.sink.publish(cause, { lockWindowEndsAtMs });
    }
  }
}

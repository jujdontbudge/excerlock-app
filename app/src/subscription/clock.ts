export interface SubscriptionClock {
  nowMs(): number;
}

export class SystemSubscriptionClock implements SubscriptionClock {
  public nowMs(): number {
    return new Date().getTime();
  }
}

/** Deterministic time source for the mock adapter's own tests. */
export class ManualSubscriptionClock implements SubscriptionClock {
  public constructor(private currentTimeMs: number) {
    if (!Number.isFinite(currentTimeMs)) {
      throw new Error("Subscription clock must start at a finite time");
    }
  }

  public nowMs(): number {
    return this.currentTimeMs;
  }

  public advanceTo(atMs: number): void {
    if (!Number.isFinite(atMs) || atMs < this.currentTimeMs) {
      throw new Error("Subscription clock cannot move backward");
    }
    this.currentTimeMs = atMs;
  }
}

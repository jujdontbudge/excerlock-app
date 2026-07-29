export interface AccountClock {
  nowMs(): number;
}

export class SystemAccountClock implements AccountClock {
  public nowMs(): number {
    return new Date().getTime();
  }
}

/** Deterministic time source for the mock adapter's own tests. */
export class ManualAccountClock implements AccountClock {
  public constructor(private currentTimeMs: number) {
    if (!Number.isFinite(currentTimeMs)) {
      throw new Error("Account clock must start at a finite time");
    }
  }

  public nowMs(): number {
    return this.currentTimeMs;
  }

  public advanceTo(atMs: number): void {
    if (!Number.isFinite(atMs) || atMs < this.currentTimeMs) {
      throw new Error("Account clock cannot move backward");
    }
    this.currentTimeMs = atMs;
  }
}

import type { LockPrecedenceDecision } from "@/lock/model/lockPrecedence";

import { ShieldCauseResolver } from "../ShieldCauseResolver";

function decision(
  cause: LockPrecedenceDecision["cause"],
  shields: LockPrecedenceDecision["shields"] = "up",
): LockPrecedenceDecision {
  return { cause, shields, drainsBalance: false };
}

describe("ShieldCauseResolver", () => {
  it("maps every blocking policy cause to its decided shield variant", () => {
    expect(new ShieldCauseResolver().resolve(decision("emptyBalance"), false)).toBe(
      "balanceEmpty",
    );
    expect(new ShieldCauseResolver().resolve(decision("fullLock"), false)).toBe(
      "fullLock",
    );
    expect(new ShieldCauseResolver().resolve(decision("activeWindow"), false)).toBe(
      "lockWindow",
    );
  });

  it("publishes and latches Walk & Scroll ended after verified access closes", () => {
    const resolver = new ShieldCauseResolver();

    // While the walk holds shields down, the predicted native shield is
    // already walk-ended — a lease lapse mid-walk renders truthfully.
    expect(resolver.resolve(decision("walking", "down"), true)).toBe(
      "walkAndScrollEnded",
    );
    expect(resolver.resolve(decision("emptyBalance"), false)).toBe(
      "walkAndScrollEnded",
    );
    expect(resolver.resolve(decision("emptyBalance"), false)).toBe(
      "walkAndScrollEnded",
    );
  });

  it("clears the walk-ended latch when access opens or a stronger cause takes over", () => {
    const resolver = new ShieldCauseResolver();
    resolver.resolve(decision("walking", "down"), true);
    resolver.resolve(decision("emptyBalance"), false);

    expect(resolver.resolve(decision("fullLock"), false)).toBe("fullLock");
    // Draining access open: the only shield the OS can apply is balance-out
    // (device-smoke Finding 10 — a down decision publishes the prediction).
    expect(resolver.resolve(decision("earnedBalance", "down"), false)).toBe(
      "balanceEmpty",
    );
    expect(resolver.resolve(decision("emptyBalance"), false)).toBe("balanceEmpty");
  });
});

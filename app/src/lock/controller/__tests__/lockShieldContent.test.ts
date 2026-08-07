import { LockShieldContent } from "../lockShieldContent";

jest.mock("@/shield/shieldContentRuntime", () => ({
  getShieldContentCoordinator: () => ({ publish: async () => undefined }),
}));

describe("LockShieldContent", () => {
  it("owns cause resolution and publishes the live lock-window boundary", async () => {
    const publish = jest.fn(async () => undefined);
    const shield = new LockShieldContent({ publish });

    await shield.publish(
      {
        shields: "up",
        drainsBalance: false,
        cause: "activeWindow",
      },
      false,
      123_456,
    );

    expect(publish).toHaveBeenCalledWith("lockWindow", {
      lockWindowEndsAtMs: 123_456,
    });
  });

  // Device-smoke Finding 10: shields-down reconciles used to publish nothing,
  // so a shield the OS applied on its own (lease lapse, final drain rung)
  // rendered stale app-group content — wrong cause, dead route-home button.
  // A down decision now publishes the shield the OS would apply next.
  describe("predicted content while shields are down", () => {
    it("publishes balanceEmpty while the balance is draining", async () => {
      const publish = jest.fn(async () => undefined);
      const shield = new LockShieldContent({ publish });

      await shield.publish(
        { shields: "down", drainsBalance: true, cause: "earnedBalance" },
        false,
      );

      expect(publish).toHaveBeenCalledWith("balanceEmpty", {
        lockWindowEndsAtMs: undefined,
      });
    });

    it("publishes walkAndScrollEnded while a walk holds the apps open", async () => {
      const publish = jest.fn(async () => undefined);
      const shield = new LockShieldContent({ publish });

      await shield.publish(
        { shields: "down", drainsBalance: true, cause: "walking" },
        true,
      );

      expect(publish).toHaveBeenCalledWith("walkAndScrollEnded", {
        lockWindowEndsAtMs: undefined,
      });
    });

    it("publishes lockWindow outside the lock hours — only a window start can shield", async () => {
      const publish = jest.fn(async () => undefined);
      const shield = new LockShieldContent({ publish });

      await shield.publish(
        { shields: "down", drainsBalance: false, cause: "outsideWindow" },
        false,
      );

      expect(publish).toHaveBeenCalledWith("lockWindow", {
        lockWindowEndsAtMs: undefined,
      });
    });

    it("still latches walk-ended for the first shields-up decision after a walk", async () => {
      const publish = jest.fn(async () => undefined);
      const shield = new LockShieldContent({ publish });

      await shield.publish(
        { shields: "down", drainsBalance: true, cause: "walking" },
        true,
      );
      await shield.publish(
        { shields: "up", drainsBalance: false, cause: "emptyBalance" },
        false,
      );

      expect(publish).toHaveBeenLastCalledWith("walkAndScrollEnded", {
        lockWindowEndsAtMs: undefined,
      });
    });
  });
});

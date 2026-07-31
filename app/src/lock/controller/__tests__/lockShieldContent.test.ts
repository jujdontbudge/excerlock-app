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
});

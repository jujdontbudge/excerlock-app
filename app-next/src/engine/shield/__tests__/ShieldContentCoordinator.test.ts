import type { NativeShieldContent } from "../ShieldContentPublisher";
import { ShieldContentCoordinator } from "../ShieldContentCoordinator";

describe("ShieldContentCoordinator", () => {
  it("publishes policy cause, cheapest offer, remote copy, and an approved route", async () => {
    const publish = jest.fn<void, [NativeShieldContent]>();
    const coordinator = new ShieldContentCoordinator({
      publisher: { publish },
      offerSource: {
        resolveOffer: async (_cause, context) => {
          expect(context).toEqual({ lockWindowEndsAtMs: 123 });
          return "A 10-min walk gets you 15 more minutes.";
        },
      },
      copySource: {
        getOverrides: () => ({ fullLock: { title: "Remote full-lock title" } }),
      },
      routeHomeSource: {
        available: async () => true,
      },
    });

    await coordinator.publish("fullLock", { lockWindowEndsAtMs: 123 });

    expect(publish).toHaveBeenCalledWith({
      cause: "fullLock",
      offerSubtitle: "A 10-min walk gets you 15 more minutes.",
      routeHomeAvailable: true,
      copyOverrides: {
        fullLock: { title: "Remote full-lock title" },
      },
    });
  });

  it("marks the deep-link action unavailable unless notification permission is approved", async () => {
    const publish = jest.fn<void, [NativeShieldContent]>();
    const coordinator = new ShieldContentCoordinator({
      publisher: { publish },
      offerSource: { resolveOffer: () => "Back at 7:00 AM." },
      copySource: { getOverrides: () => ({}) },
      routeHomeSource: { available: async () => false },
    });

    await coordinator.publish("lockWindow");

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: "lockWindow",
        routeHomeAvailable: false,
      }),
    );
  });
});

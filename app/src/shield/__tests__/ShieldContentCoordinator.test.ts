import type { ShieldContent } from "../ShieldContentPublisher";
import { ShieldContentCoordinator } from "../ShieldContentCoordinator";

describe("ShieldContentCoordinator", () => {
  it("publishes policy cause, cheapest offer, remote copy, and an approved route", async () => {
    const publish = jest.fn<void, [ShieldContent]>();
    const coordinator = new ShieldContentCoordinator({
      publisher: { publish },
      offerSource: {
        current: () => "A 10-min walk gets you 15 more minutes.",
      },
      copySource: {
        current: () => ({ fullLock: { title: "Remote full-lock title" } }),
      },
      routeHomeSource: {
        available: async () => true,
      },
    });

    await coordinator.publish("fullLock");

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
    const publish = jest.fn<void, [ShieldContent]>();
    const coordinator = new ShieldContentCoordinator({
      publisher: { publish },
      offerSource: { current: () => "Back at 7:00 AM." },
      copySource: { current: () => ({}) },
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

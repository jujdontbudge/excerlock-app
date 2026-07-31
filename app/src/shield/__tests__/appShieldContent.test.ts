import type { ConfiguredCondition } from "@excerlock/condition-model";

import type { ShieldContent } from "../ShieldContentPublisher";
import { createAppShieldContentCoordinator } from "../appShieldContent";

const stepsExchange: ConfiguredCondition = {
  id: "step-rate",
  catalogId: "steps-rate",
  source: "appleHealth",
  settings: {
    kind: "rate",
    reward: { type: "proportionalCredit", minutesPerUnit: 0.02 },
  },
};

describe("createAppShieldContentCoordinator", () => {
  it("publishes app-owned conditions and authorization through the extension writer", async () => {
    const publish = jest.fn<void, [ShieldContent]>();
    const coordinator = createAppShieldContentCoordinator({
      publisher: { publish },
      activeConditions: () => [stepsExchange],
      readSignals: async () => ({ totals: { steps: 4_000 }, activeSignals: [] }),
      routeHomeSource: { available: async () => true },
      copySource: { current: () => ({}) },
    });

    await coordinator.publish("fullLock");

    expect(publish).toHaveBeenCalledWith({
      cause: "fullLock",
      offerSubtitle: "1,000 steps gets you 20 more minutes.",
      routeHomeAvailable: true,
      copyOverrides: {},
    });
  });

  it("fails closed when live signals or notification authorization are unavailable", async () => {
    const publish = jest.fn<void, [ShieldContent]>();
    const coordinator = createAppShieldContentCoordinator({
      publisher: { publish },
      activeConditions: () => [],
      readSignals: async () => {
        throw new Error("Health permission unavailable");
      },
      routeHomeSource: { available: async () => false },
      copySource: { current: () => ({}) },
    });

    await expect(coordinator.publish("balanceEmpty")).resolves.toBeUndefined();
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: "balanceEmpty",
        routeHomeAvailable: false,
      }),
    );
  });
});

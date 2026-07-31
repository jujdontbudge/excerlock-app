jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { KingstinctHealthKitClient } from "@/signals/health/KingstinctHealthKitClient";
import { ContractKingstinctHealthKitModule } from "@/signals/health/testing/ContractKingstinctHealthKitModule";

import { createHealthKitHomeSignalFeed } from "../healthKitFeed";

describe("native Home signal composition", () => {
  it("reads walking from the shared explicit session", async () => {
    let walking = false;
    const listeners = new Set<() => void>();
    const feed = createHealthKitHomeSignalFeed(
      {
        health: new KingstinctHealthKitClient(
          new ContractKingstinctHealthKitModule(),
        ),
      },
      {
        getSnapshot: () => ({
          active: walking,
          conditionId: walking ? "walking-condition" : null,
          walking,
        }),
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
    );

    await feed.start();
    expect((await feed.read()).activeSignals).toEqual([]);

    walking = true;
    listeners.forEach((listener) => listener());

    expect((await feed.read()).activeSignals).toEqual(["walking"]);
    feed.dispose();
  });
});

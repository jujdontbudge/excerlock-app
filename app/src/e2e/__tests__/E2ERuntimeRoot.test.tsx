jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockReplace = jest.fn();

// The gate reads both linking sources, because on the simulator only React
// Native's delivered the cold-launch URL. Here the Expo-module hook is the
// empty one, which is exactly the arrangement that broke the flows.
jest.mock("expo-linking", () => ({
  useLinkingURL: () => null,
  useURL: () => "excerlock://e2e/scenario/baseline-fresh-install",
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { getHomeAppRuntime } from "@/home";
import { getSubscriptionModule } from "@/subscription";

import { E2ERuntimeRoot } from "../E2ERuntimeRoot";

describe("E2E runtime composition root", () => {
  it("installs the selected fixtures and pinned clock before mounting the app", async () => {
    await render(
      <E2ERuntimeRoot>
        <Text>Normal app</Text>
      </E2ERuntimeRoot>,
    );

    expect(await screen.findByText("Normal app")).toBeOnTheScreen();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));

    const runtime = getHomeAppRuntime();
    expect(runtime.now()).toBe(
      Date.parse("2026-07-29T09:41:00-04:00"),
    );
    expect(await runtime.feed.read()).toEqual({
      activeSignals: [],
      totals: {
        activeCalories: 0,
        activeMinutes: 0,
        cycleDistance: 0,
        runDistance: 0,
        steps: 0,
        swimDistance: 0,
        workoutDuration: 0,
      },
    });
    expect(
      (await getSubscriptionModule().getSnapshot()).entitlement,
    ).toMatchObject({
      status: "active",
      productId: "e2e-premium",
      purchasedAtMs: Date.parse("2026-07-29T09:41:00-04:00"),
    });
  });
});

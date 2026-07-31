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
  useURL: () =>
    "excerlock://e2e/scenario/baseline-fresh-install?overrides=%7B%22timeline%22%3A%5B%7B%22atMs%22%3A0%2C%22event%22%3A%22location.update%22%2C%22payload%22%3A%7B%22lat%22%3A40.741%2C%22lon%22%3A-73.989%2C%22accuracy%22%3A8%7D%7D%5D%7D",
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { getHomeAppRuntime, useHomeStore } from "@/home";
import { getGymPresenceController } from "@/home/signals/gymPresenceController";
import { SignalRuntimeHosts } from "@/home/signals/SignalRuntimeHosts";
import { getWalkingSessionController } from "@/home/signals/walkingSessionController";
import { getLockAppRuntime } from "@/lock";
import { getScreenTimeAppRuntime } from "@/screentime";
import { getSubscriptionModule } from "@/subscription";
import { getSupportModule } from "@/support";

import { E2ERuntimeRoot } from "../E2ERuntimeRoot";

describe("E2E runtime composition root", () => {
  it("installs the selected fixtures and pinned clock before mounting the app", async () => {
    await render(
      <E2ERuntimeRoot>
        <SignalRuntimeHosts />
        <Text>Normal app</Text>
      </E2ERuntimeRoot>,
    );

    expect(await screen.findByText("Normal app")).toBeOnTheScreen();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));

    const runtime = getHomeAppRuntime();
    expect(runtime.now()).toBe(
      Date.parse("2026-07-29T09:41:00-04:00"),
    );
    expect(getLockAppRuntime().now()).toBe(
      Date.parse("2026-07-29T09:41:00-04:00"),
    );
    expect(getScreenTimeAppRuntime().clock.nowMs()).toBe(
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
    await act(async () => {
      useHomeStore.getState().addCondition({
        id: "e2e-walking",
        catalogId: "walking-state",
        source: "motion",
        settings: {
          kind: "state",
          reward: { type: "sustainedUnlock" },
          exitGraceMs: 30_000,
        },
      });
    });
    const walkingSession = getWalkingSessionController();
    await expect(walkingSession.start("e2e-walking")).resolves.toBe(true);
    await walkingSession.stop();
    await act(async () => {
      useHomeStore.getState().addCondition({
        id: "e2e-gym",
        catalogId: "gym-arrival",
        source: "location",
        placeId: "e2e-gym-place",
        settings: {
          kind: "event",
          reward: { type: "fixedMinutes", minutes: 30 },
          repeatable: false,
          perDayCap: null,
          cooldownMs: 0,
        },
      });
      useHomeStore.setState({
        savedPlaces: [
          {
            id: "e2e-gym-place",
            name: "E2E gym",
            geofence: {
              latitude: 40.741,
              longitude: -73.989,
              radiusMeters: 100,
            },
          },
        ],
      });
    });
    jest.useFakeTimers();
    const checkIn = getGymPresenceController().checkIn("e2e-gym");
    await jest.advanceTimersByTimeAsync(30_000);
    await expect(checkIn).resolves.toBe(true);
    jest.useRealTimers();
    expect(
      (await getSubscriptionModule().getSnapshot()).entitlement,
    ).toMatchObject({
      status: "active",
      productId: "e2e-premium",
      purchasedAtMs: Date.parse("2026-07-29T09:41:00-04:00"),
    });
    await expect(
      getSupportModule().submitSupport({ message: "Scenario support" }),
    ).resolves.toMatchObject({ status: "submitted" });
    await expect(getSupportModule().getSnapshot()).resolves.toMatchObject({
      submissions: [
        expect.objectContaining({
          message: "Scenario support",
          createdAtMs: Date.parse("2026-07-29T09:41:00-04:00"),
          status: "submitted",
        }),
      ],
    });
  });
});

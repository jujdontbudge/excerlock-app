jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ConfiguredCondition } from "@excerlock/condition-model";

import { FixtureLocationProvider } from "@/signals";
import { PRESENCE_CONFIRMATION_MS } from "@/signals/location/GeofenceEventProcessor";

import { SaveGymCard } from "../../builder/components/SaveGymCard";
import { useHomeStore } from "../../store/homeStore";
import { GymPresenceController } from "../gymPresenceController";

/**
 * The user journey end to end: stand in the gym, save it from the card, add
 * a gym condition for it, then check in from the same spot. Only the location
 * source is a fixture; the card, store, and controller are the real ones.
 */
describe("save a gym, then check in from it", () => {
  const phoneInGym = { lat: 40.741, lon: -73.989, accuracy: 8 };

  beforeEach(() => {
    useHomeStore.getState().reset();
  });

  it("confirms presence and pays out once the saved gym is used by a condition", async () => {
    const location = new FixtureLocationProvider({
      name: "standing-in-gym",
      version: 1,
      description: "One fix taken inside the gym.",
      timeline: [{ atMs: 1_000, event: "location.update", payload: phoneInGym }],
    });
    location.advanceTo(1_000);

    await render(
      <SaveGymCard
        savedPlaces={[]}
        locate={() => location.locateForGymSetup()}
        onSave={useHomeStore.getState().addSavedPlace}
        createId={() => "gym-home"}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText("Gym name"), "Home gym");
    await fireEvent.press(screen.getByText("Save my current location"));
    await act(async () => undefined);

    expect(useHomeStore.getState().savedPlaces).toEqual([
      {
        id: "gym-home",
        name: "Home gym",
        geofence: { latitude: 40.741, longitude: -73.989, radiusMeters: 100 },
      },
    ]);

    const condition: ConfiguredCondition = {
      id: "gym-arrival-1",
      catalogId: "gym-arrival",
      source: "location",
      placeId: "gym-home",
      settings: {
        kind: "event",
        reward: { type: "fixedMinutes", minutes: 30 },
        repeatable: false,
        perDayCap: null,
        cooldownMs: 0,
      },
    };
    useHomeStore.getState().addCondition(condition);

    const recordEventPayout = jest.fn();
    const controller = new GymPresenceController({
      getState: () => useHomeStore.getState(),
      getLocation: () => location,
      now: () => 5_000,
      recordEventPayout,
    });
    // Check-in confirms presence only after a dwell, so run that on a fake clock.
    jest.useFakeTimers();
    const confirmed = controller.checkIn("gym-arrival-1");
    await jest.advanceTimersByTimeAsync(PRESENCE_CONFIRMATION_MS);
    jest.useRealTimers();
    await expect(confirmed).resolves.toBe(true);
    expect(recordEventPayout).toHaveBeenCalledWith("gym-arrival-1", 5_000);
    expect(location.isInsideRegion("gym-home")).toBe(true);

    location.dispose();
  });

  it("refuses a check-in when the phone is not at the saved gym", async () => {
    const location = new FixtureLocationProvider({
      name: "left-the-gym",
      version: 1,
      description: "A fix inside the gym, then one a kilometre away.",
      timeline: [
        { atMs: 1_000, event: "location.update", payload: phoneInGym },
        { atMs: 2_000, event: "location.update", payload: { lat: 40.75, lon: -73.98, accuracy: 8 } },
      ],
    });
    location.advanceTo(1_000);
    useHomeStore.getState().addSavedPlace({
      id: "gym-home",
      name: "Home gym",
      geofence: { latitude: 40.741, longitude: -73.989, radiusMeters: 100 },
    });
    useHomeStore.getState().addCondition({
      id: "gym-arrival-1",
      catalogId: "gym-arrival",
      source: "location",
      placeId: "gym-home",
      settings: {
        kind: "event",
        reward: { type: "fixedMinutes", minutes: 30 },
        repeatable: false,
        perDayCap: null,
        cooldownMs: 0,
      },
    });
    location.advanceTo(2_000);

    const recordEventPayout = jest.fn();
    const controller = new GymPresenceController({
      getState: () => useHomeStore.getState(),
      getLocation: () => location,
      now: () => 5_000,
      recordEventPayout,
    });
    await expect(controller.checkIn("gym-arrival-1")).resolves.toBe(false);
    expect(recordEventPayout).not.toHaveBeenCalled();
    location.dispose();
  });
});

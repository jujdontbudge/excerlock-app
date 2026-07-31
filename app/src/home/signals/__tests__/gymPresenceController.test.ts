jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";

import { GymPresenceController } from "../gymPresenceController";
import type { RegionTransition } from "@/signals";

const gymArrival: ConfiguredCondition = {
  id: "gym-arrival-condition",
  catalogId: "gym-arrival",
  source: "location",
  placeId: "gym-one",
  settings: {
    kind: "event",
    reward: { type: "fixedMinutes", minutes: 30 },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

describe("GymPresenceController manual check-in", () => {
  it("samples the saved gym and pays only after location confirms presence", async () => {
    const checkIn = jest.fn().mockResolvedValue(true);
    const recordEventPayout = jest.fn();
    const controller = new GymPresenceController({
      getState: () => ({
        conditions: [gymArrival],
        disabledConditionIds: [],
        savedPlaces: [
          {
            id: "gym-one",
            name: "Neighborhood gym",
            geofence: {
              latitude: 40.7128,
              longitude: -74.006,
              radiusMeters: 100,
            },
          },
        ],
      }),
      getLocation: () => ({
        checkIn,
        getAuthorizationStatus: () => "authorizedWhenInUse",
        on: () => () => {},
        startMonitoringRegions: async () => {},
        stopMonitoringRegions: async () => {},
      }),
      now: () => 123_000,
      recordEventPayout,
    });

    await expect(controller.checkIn("gym-arrival-condition")).resolves.toBe(true);
    expect(checkIn).toHaveBeenCalledWith({
      id: "gym-one",
      latitude: 40.7128,
      longitude: -74.006,
      radiusMeters: 100,
    });
    expect(recordEventPayout).toHaveBeenCalledWith(
      "gym-arrival-condition",
      123_000,
    );
  });

  it("starts background geofencing only from the explicit auto-detect opt-in", async () => {
    let autoDetectEnabled = false;
    const startMonitoringRegions = jest.fn().mockResolvedValue(undefined);
    const getLocation = jest.fn(() => ({
      checkIn: jest.fn(),
      getAuthorizationStatus: () => "authorizedWhenInUse" as const,
      on: () => () => {},
      startMonitoringRegions,
      stopMonitoringRegions: jest.fn(),
    }));
    const controller = new GymPresenceController({
      getState: () => ({
        autoDetectEnabled,
        conditions: [gymArrival],
        disabledConditionIds: [],
        savedPlaces: [
          {
            id: "gym-one",
            name: "Neighborhood gym",
            geofence: {
              latitude: 40.7128,
              longitude: -74.006,
              radiusMeters: 100,
            },
          },
        ],
      }),
      getLocation,
      now: () => 123_000,
      recordEventPayout: jest.fn(),
      setAutoDetectEnabled: (enabled) => {
        autoDetectEnabled = enabled;
      },
    });

    await controller.reconcileAutoDetect();
    expect(getLocation).not.toHaveBeenCalled();

    await expect(controller.enableAutoDetect()).resolves.toBe(true);
    expect(startMonitoringRegions).toHaveBeenCalledWith([
      {
        id: "gym-one",
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 100,
      },
    ]);
    expect(autoDetectEnabled).toBe(true);
  });

  it("books a confirmed auto-detect enter for the matching gym condition", async () => {
    let onRegion: (transition: RegionTransition) => void = () => {};
    const recordEventPayout = jest.fn();
    const controller = new GymPresenceController({
      getState: () => ({
        autoDetectEnabled: false,
        conditions: [gymArrival],
        disabledConditionIds: [],
        savedPlaces: [
          {
            id: "gym-one",
            name: "Neighborhood gym",
            geofence: {
              latitude: 40.7128,
              longitude: -74.006,
              radiusMeters: 100,
            },
          },
        ],
      }),
      getLocation: () => ({
        checkIn: jest.fn(),
        getAuthorizationStatus: () => "authorizedWhenInUse",
        startMonitoringRegions: async () => {},
        stopMonitoringRegions: async () => {},
        on: (_event, listener) => {
          onRegion = listener as (transition: RegionTransition) => void;
          return () => {};
        },
      }),
      now: () => 123_000,
      recordEventPayout,
      setAutoDetectEnabled: jest.fn(),
      toLedgerTime: (atMs) => atMs + 1_000,
    });
    await controller.enableAutoDetect();

    onRegion({ type: "exit", regionId: "gym-one", atMs: 400_000 });
    onRegion({ type: "enter", regionId: "gym-one", atMs: 456_000 });

    expect(recordEventPayout).toHaveBeenCalledTimes(1);
    expect(recordEventPayout).toHaveBeenCalledWith(
      "gym-arrival-condition",
      457_000,
    );
  });

  it("claims a coordinate-free visit persisted by the background task", async () => {
    const recordEventPayout = jest.fn();
    const controller = new GymPresenceController({
      getConfirmedVisits: async () => [
        { regionId: "gym-one", atMs: 500_000 },
      ],
      getState: () => ({
        autoDetectEnabled: true,
        conditions: [gymArrival],
        disabledConditionIds: [],
        savedPlaces: [
          {
            id: "gym-one",
            name: "Neighborhood gym",
            geofence: {
              latitude: 40.7128,
              longitude: -74.006,
              radiusMeters: 100,
            },
          },
        ],
      }),
      getLocation: () => ({
        checkIn: jest.fn(),
        getAuthorizationStatus: () => "authorizedAlways",
        on: () => () => {},
        startMonitoringRegions: async () => {},
        stopMonitoringRegions: async () => {},
      }),
      now: () => 123_000,
      recordEventPayout,
      toLedgerTime: (atMs) => atMs + 1_000,
    });

    await controller.reconcileAutoDetect();

    expect(recordEventPayout).toHaveBeenCalledWith(
      "gym-arrival-condition",
      501_000,
    );
  });
});

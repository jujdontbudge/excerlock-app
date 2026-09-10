import { ExpoLocationClient, type ExpoLocationModule } from "../ExpoLocationClient";
import { LocationTaskRuntime } from "../LocationTaskRuntime";
import {
  GEOFENCE_TASK_NAME,
  WALK_LOCATION_TASK_NAME,
} from "../locationTaskNames";

describe("ExpoLocationClient", () => {
  it("hydrates persisted native permission and Walk task state", async () => {
    const expo = new RecordingExpoLocationModule();
    const client = new ExpoLocationClient(
      expo,
      new LocationTaskRuntime({ append: async () => undefined, readAll: async () => [] }),
    );

    await client.hydrateState();

    expect(client.getAuthorizationStatus()).toBe("authorizedAlways");
    expect(client.isLocationUpdatesActive()).toBe(true);
  });

  it("translates the LocationProvider boundary to Expo Location", async () => {
    const expo = new RecordingExpoLocationModule();
    const client = new ExpoLocationClient(
      expo,
      new LocationTaskRuntime({ append: async () => undefined, readAll: async () => [] }),
    );

    expect(client.getAuthorizationStatus()).toBe("notDetermined");
    expect(await client.requestForegroundAuthorization()).toBe(
      "authorizedWhenInUse",
    );
    expect(await client.requestBackgroundAuthorization()).toBe(
      "authorizedAlways",
    );

    await client.startGeofencing([
      {
        id: "gym-a",
        latitude: 40.741,
        longitude: -73.989,
        radiusMeters: 100,
      },
    ]);
    expect(expo.startGeofencingAsync).toHaveBeenCalledWith(
      GEOFENCE_TASK_NAME,
      [
        {
          identifier: "gym-a",
          latitude: 40.741,
          longitude: -73.989,
          radius: 100,
          notifyOnEnter: true,
          notifyOnExit: true,
        },
      ],
    );

    await expect(client.getCurrentLocation()).resolves.toEqual({
      lat: 40.741,
      lon: -73.989,
      accuracy: 8,
      atMs: 2_000,
    });

    await client.startLocationUpdates();
    expect(expo.startLocationUpdatesAsync).toHaveBeenCalledWith(
      WALK_LOCATION_TASK_NAME,
      {
        accuracy: "high",
        activityType: "fitness",
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      },
    );
    expect(client.isLocationUpdatesActive()).toBe(true);

    await client.stopLocationUpdates();
    expect(expo.stopLocationUpdatesAsync).toHaveBeenCalledWith(
      WALK_LOCATION_TASK_NAME,
    );
    expect(client.isLocationUpdatesActive()).toBe(false);
  });

  it("skips stopping an absent geofence task and rechecks on repeated stops", async () => {
    const expo = new RecordingExpoLocationModule();
    expo.hasStartedGeofencingAsync.mockResolvedValue(false);
    const client = createClient(expo);

    await client.stopGeofencing();
    await client.stopGeofencing();

    expect(expo.hasStartedGeofencingAsync).toHaveBeenCalledTimes(2);
    expect(expo.hasStartedGeofencingAsync).toHaveBeenCalledWith(GEOFENCE_TASK_NAME);
    expect(expo.stopGeofencingAsync).not.toHaveBeenCalled();
  });

  it("stops a registered geofence task", async () => {
    const expo = new RecordingExpoLocationModule();
    expo.hasStartedGeofencingAsync.mockResolvedValue(true);
    const client = createClient(expo);

    await client.stopGeofencing();

    expect(expo.stopGeofencingAsync).toHaveBeenCalledWith(GEOFENCE_TASK_NAME);
  });

  it("rechecks native registration when repeated stops transition from present to absent", async () => {
    const expo = new RecordingExpoLocationModule();
    expo.hasStartedGeofencingAsync.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const client = createClient(expo);

    await client.stopGeofencing();
    await client.stopGeofencing();

    expect(expo.hasStartedGeofencingAsync).toHaveBeenCalledTimes(2);
    expect(expo.stopGeofencingAsync).toHaveBeenCalledTimes(1);
  });

  it("propagates geofence query and stop failures", async () => {
    const queryFailure = new Error("query failed");
    const queryExpo = new RecordingExpoLocationModule();
    queryExpo.hasStartedGeofencingAsync.mockRejectedValue(queryFailure);
    await expect(createClient(queryExpo).stopGeofencing()).rejects.toBe(queryFailure);
    expect(queryExpo.stopGeofencingAsync).not.toHaveBeenCalled();

    const stopFailure = new Error("stop failed");
    const stopExpo = new RecordingExpoLocationModule();
    stopExpo.hasStartedGeofencingAsync.mockResolvedValue(true);
    stopExpo.stopGeofencingAsync.mockRejectedValue(stopFailure);
    await expect(createClient(stopExpo).stopGeofencing()).rejects.toBe(stopFailure);
  });

  it("serializes concurrent geofence start and stop operations", async () => {
    let finishStart!: () => void;
    let markStartEntered!: () => void;
    const startEntered = new Promise<void>((resolve) => { markStartEntered = resolve; });
    const startGate = new Promise<undefined>((resolve) => { finishStart = () => resolve(undefined); });
    const expo = new RecordingExpoLocationModule();
    expo.startGeofencingAsync.mockImplementation(() => {
      markStartEntered();
      return startGate;
    });
    expo.hasStartedGeofencingAsync.mockResolvedValue(true);
    const client = createClient(expo);

    const start = client.startGeofencing([{ id: "gym-a", latitude: 1, longitude: 2, radiusMeters: 100 }]);
    const stop = client.stopGeofencing();
    await startEntered;
    expect(expo.hasStartedGeofencingAsync).not.toHaveBeenCalled();
    finishStart();
    await Promise.all([start, stop]);
    expect(expo.startGeofencingAsync.mock.invocationCallOrder[0]).toBeLessThan(
      expo.hasStartedGeofencingAsync.mock.invocationCallOrder[0],
    );
    expect(expo.hasStartedGeofencingAsync.mock.invocationCallOrder[0]).toBeLessThan(
      expo.stopGeofencingAsync.mock.invocationCallOrder[0],
    );
  });

  it("does not start while a concurrent geofence stop is querying or stopping", async () => {
    let finishQuery!: (started: boolean) => void;
    const queryGate = new Promise<boolean>((resolve) => { finishQuery = resolve; });
    let finishStop!: () => void;
    let markStopEntered!: () => void;
    const stopEntered = new Promise<void>((resolve) => { markStopEntered = resolve; });
    const stopGate = new Promise<undefined>((resolve) => { finishStop = () => resolve(undefined); });
    const expo = new RecordingExpoLocationModule();
    expo.hasStartedGeofencingAsync.mockImplementation(() => queryGate);
    expo.stopGeofencingAsync.mockImplementation(() => {
      markStopEntered();
      return stopGate;
    });
    const client = createClient(expo);

    const stop = client.stopGeofencing();
    const start = client.startGeofencing([{ id: "gym-a", latitude: 1, longitude: 2, radiusMeters: 100 }]);
    await Promise.resolve();
    expect(expo.startGeofencingAsync).not.toHaveBeenCalled();
    finishQuery(true);
    await stopEntered;
    expect(expo.stopGeofencingAsync).toHaveBeenCalledTimes(1);
    expect(expo.startGeofencingAsync).not.toHaveBeenCalled();
    finishStop();
    await Promise.all([stop, start]);
    expect(expo.stopGeofencingAsync.mock.invocationCallOrder[0]).toBeLessThan(
      expo.startGeofencingAsync.mock.invocationCallOrder[0],
    );
  });

  it("recovers the geofence operation queue after a rejection", async () => {
    const expo = new RecordingExpoLocationModule();
    expo.hasStartedGeofencingAsync.mockRejectedValueOnce(new Error("query failed")).mockResolvedValueOnce(false);
    const client = createClient(expo);

    await expect(client.stopGeofencing()).rejects.toThrow("query failed");
    await expect(client.stopGeofencing()).resolves.toBeUndefined();
    await expect(client.startGeofencing([{ id: "gym-a", latitude: 1, longitude: 2, radiusMeters: 100 }]))
      .resolves.toBeUndefined();
  });
});

function createClient(expo: ExpoLocationModule) {
  return new ExpoLocationClient(
    expo,
    new LocationTaskRuntime({ append: async () => undefined, readAll: async () => [] }),
  );
}

class RecordingExpoLocationModule implements ExpoLocationModule {
  public readonly Accuracy = { High: "high" } as const;
  public readonly ActivityType = { Fitness: "fitness" } as const;
  public readonly startGeofencingAsync = jest.fn(async () => undefined);
  public readonly hasStartedGeofencingAsync = jest.fn(async () => false);
  public readonly stopGeofencingAsync = jest.fn(async () => undefined);
  public readonly startLocationUpdatesAsync = jest.fn(async () => undefined);
  public readonly stopLocationUpdatesAsync = jest.fn(async () => undefined);

  public async getForegroundPermissionsAsync() {
    return {
      status: "granted" as const,
      ios: { scope: "whenInUse" as const },
    };
  }

  public async getBackgroundPermissionsAsync() {
    return {
      status: "granted" as const,
      ios: { scope: "always" as const },
    };
  }

  public async hasStartedLocationUpdatesAsync() {
    return true;
  }

  public async requestForegroundPermissionsAsync() {
    return {
      status: "granted" as const,
      ios: { scope: "whenInUse" as const },
    };
  }

  public async requestBackgroundPermissionsAsync() {
    return {
      status: "granted" as const,
      ios: { scope: "always" as const },
    };
  }

  public async getCurrentPositionAsync() {
    return {
      coords: { latitude: 40.741, longitude: -73.989, accuracy: 8 },
      timestamp: 2_000,
    };
  }
}

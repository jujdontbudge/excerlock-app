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
});

class RecordingExpoLocationModule implements ExpoLocationModule {
  public readonly Accuracy = { High: "high" } as const;
  public readonly ActivityType = { Fitness: "fitness" } as const;
  public readonly startGeofencingAsync = jest.fn(async () => undefined);
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

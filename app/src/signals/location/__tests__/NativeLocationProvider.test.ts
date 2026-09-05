import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationSample,
  RegionTransition,
} from "..";
import type { NativeLocationClient } from "../NativeLocationClient";
import { NativeLocationProvider } from "../NativeLocationProvider";
import { GYM_RADIUS_METERS } from "../gymRegions";
import { runLocationProviderContract } from "../testing/providerContract";

runLocationProviderContract("NativeLocationProvider", () => {
  const client = new ContractLocationClient();
  const provider = new NativeLocationProvider(client);

  return {
    provider,
    advanceTo: (atMs) => client.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

describe("NativeLocationProvider gym limits", () => {
  it("rejects a sixth saved gym before changing native monitoring", async () => {
    const client = new ContractLocationClient();
    const provider = new NativeLocationProvider(client);
    const regions = Array.from({ length: 6 }, (_, index) => ({
      id: `gym-${index + 1}`,
      latitude: 40.741 + index / 1_000,
      longitude: -73.989,
      radiusMeters: 100,
    }));

    await expect(provider.startMonitoringRegions(regions)).rejects.toThrow(
      "At most 5 saved gyms can be monitored",
    );
    expect(client.startedRegions).toEqual([]);

    provider.dispose();
  });

  it("keeps saved-gym radii within the 50–200 m product range", async () => {
    expect(GYM_RADIUS_METERS).toEqual({ default: 100, min: 50, max: 200 });

    const client = new ContractLocationClient();
    const provider = new NativeLocationProvider(client);
    await expect(
      provider.startMonitoringRegions([
        {
          id: "too-tight",
          latitude: 40.741,
          longitude: -73.989,
          radiusMeters: 49,
        },
      ]),
    ).rejects.toThrow("Gym radius must be between 50 and 200 meters");
    expect(client.startedRegions).toEqual([]);

    provider.dispose();
  });
});

describe("NativeLocationProvider permission timing", () => {
  it("manual check-in samples once with foreground permission only", async () => {
    jest.useFakeTimers();
    const client = new ContractLocationClient("notDetermined");
    const provider = new NativeLocationProvider(client);
    const transitions: RegionTransition[] = [];
    provider.on("region", (transition) => transitions.push(transition));

    const checkingIn = provider.checkIn({
        id: "gym-a",
        latitude: 40.741,
        longitude: -73.989,
        radiusMeters: 100,
      });
    await jest.advanceTimersByTimeAsync(0);

    expect(client.foregroundAuthorizationRequests).toBe(1);
    expect(client.backgroundAuthorizationRequests).toBe(0);
    expect(client.currentLocationRequests).toBe(1);
    expect(provider.getAuthorizationStatus()).toBe("authorizedWhenInUse");
    expect(provider.isInsideRegion("gym-a")).toBe(true);
    expect(transitions).toEqual([]);

    await jest.advanceTimersByTimeAsync(29_999);
    expect(transitions).toEqual([]);

    await jest.advanceTimersByTimeAsync(1);
    await expect(checkingIn).resolves.toBe(true);
    expect(transitions).toEqual([
      { type: "enter", regionId: "gym-a", atMs: 1_000 },
    ]);

    provider.dispose();
    jest.useRealTimers();
  });

  it("requests Always only when auto-detect is explicitly started", async () => {
    const client = new ContractLocationClient("notDetermined");
    const provider = new NativeLocationProvider(client);
    const gym: GeofenceRegion = {
      id: "gym-a",
      latitude: 40.741,
      longitude: -73.989,
      radiusMeters: 100,
    };

    expect(client.foregroundAuthorizationRequests).toBe(0);
    expect(client.backgroundAuthorizationRequests).toBe(0);
    expect(client.startedRegions).toEqual([]);

    await provider.startMonitoringRegions([gym]);

    expect(client.foregroundAuthorizationRequests).toBe(1);
    expect(client.backgroundAuthorizationRequests).toBe(1);
    expect(provider.getAuthorizationStatus()).toBe("authorizedAlways");
    expect(client.startedRegions).toEqual([[gym]]);

    provider.dispose();
  });
});

class ContractLocationClient implements NativeLocationClient {
  private readonly locationListeners = new Set<(sample: LocationSample) => void>();
  private readonly presenceListeners = new Set<(transition: RegionTransition) => void>();
  private readonly regionListeners = new Set<(transition: RegionTransition) => void>();
  private locationDelivered = false;
  private exitDelivered = false;
  private walkActive = false;
  private authorizationStatus: LocationAuthorizationStatus;
  public backgroundAuthorizationRequests = 0;
  public currentLocationRequests = 0;
  public foregroundAuthorizationRequests = 0;
  public readonly startedRegions: GeofenceRegion[][] = [];

  public constructor(
    authorizationStatus: LocationAuthorizationStatus = "authorizedAlways",
  ) {
    this.authorizationStatus = authorizationStatus;
  }

  public async hydrateState(): Promise<void> {}

  public getAuthorizationStatus(): LocationAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async requestForegroundAuthorization(): Promise<LocationAuthorizationStatus> {
    this.foregroundAuthorizationRequests += 1;
    if (this.authorizationStatus === "notDetermined") {
      this.authorizationStatus = "authorizedWhenInUse";
    }
    return this.authorizationStatus;
  }

  public async requestBackgroundAuthorization(): Promise<LocationAuthorizationStatus> {
    this.backgroundAuthorizationRequests += 1;
    this.authorizationStatus = "authorizedAlways";
    return this.authorizationStatus;
  }

  public getCachedRegionPresence(regionId: string): boolean | null {
    return regionId === "gym-a";
  }

  public getLastLocation(): LocationSample | null {
    return null;
  }

  public async getCurrentLocation(): Promise<LocationSample> {
    this.currentLocationRequests += 1;
    return sample;
  }

  public confirmRegionPresence(transition: RegionTransition): Promise<void> {
    this.presenceListeners.forEach((listener) => listener(transition));
    if (transition.type === "exit") {
      this.regionListeners.forEach((listener) => listener(transition));
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        this.regionListeners.forEach((listener) => listener(transition));
        resolve();
      }, 30_000);
    });
  }

  public async startGeofencing(regions: readonly GeofenceRegion[]): Promise<void> {
    this.startedRegions.push([...regions]);
  }

  public async stopGeofencing(): Promise<void> {}

  public async startLocationUpdates(): Promise<void> {
    this.walkActive = true;
  }

  public async stopLocationUpdates(): Promise<void> {
    this.walkActive = false;
  }

  public isLocationUpdatesActive(): boolean {
    return this.walkActive;
  }

  public onRegionPresence(callback: (transition: RegionTransition) => void): () => void {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  public onRegionTransition(callback: (transition: RegionTransition) => void): () => void {
    this.regionListeners.add(callback);
    return () => this.regionListeners.delete(callback);
  }

  public onLocation(callback: (sample: LocationSample) => void): () => void {
    this.locationListeners.add(callback);
    return () => this.locationListeners.delete(callback);
  }

  public advanceTo(atMs: number): void {
    if (atMs >= 1_000 && !this.locationDelivered) {
      this.locationDelivered = true;
      this.locationListeners.forEach((listener) => listener(sample));
    }
    if (atMs >= 2_000 && !this.exitDelivered) {
      this.exitDelivered = true;
      const exit: RegionTransition = {
        type: "exit",
        regionId: "gym-a",
        atMs: 2_000,
      };
      this.presenceListeners.forEach((listener) => listener(exit));
      this.regionListeners.forEach((listener) => listener(exit));
    }
  }
}

const sample: LocationSample = {
  lat: 40.741,
  lon: -73.989,
  accuracy: 8,
  atMs: 1_000,
};

describe("NativeLocationProvider gym setup fix", () => {
  it("asks for foreground permission once and returns one fix", async () => {
    const client = new ContractLocationClient("notDetermined");
    const provider = new NativeLocationProvider(client);

    const fix = await provider.locateForGymSetup();

    expect(client.currentLocationRequests).toBe(1);
    expect(provider.getAuthorizationStatus()).toBe("authorizedWhenInUse");
    expect(provider.getLastLocation()).toEqual(fix);
    provider.dispose();
  });

  it("refuses to take a fix without permission", async () => {
    const client = new ContractLocationClient("denied");
    const provider = new NativeLocationProvider(client);

    await expect(provider.locateForGymSetup()).rejects.toThrow(
      "Location authorization is required to save a gym",
    );
    expect(client.currentLocationRequests).toBe(0);
    provider.dispose();
  });
});

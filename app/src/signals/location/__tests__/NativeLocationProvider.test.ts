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

class ContractLocationClient implements NativeLocationClient {
  private readonly locationListeners = new Set<(sample: LocationSample) => void>();
  private readonly presenceListeners = new Set<(transition: RegionTransition) => void>();
  private readonly regionListeners = new Set<(transition: RegionTransition) => void>();
  private locationDelivered = false;
  private exitDelivered = false;
  private walkActive = false;
  public readonly startedRegions: GeofenceRegion[][] = [];

  public getAuthorizationStatus(): LocationAuthorizationStatus {
    return "authorizedAlways";
  }

  public async requestForegroundAuthorization(): Promise<LocationAuthorizationStatus> {
    return "authorizedAlways";
  }

  public async requestBackgroundAuthorization(): Promise<LocationAuthorizationStatus> {
    return "authorizedAlways";
  }

  public getCachedRegionPresence(regionId: string): boolean | null {
    return regionId === "gym-a";
  }

  public getLastLocation(): LocationSample | null {
    return null;
  }

  public async getCurrentLocation(): Promise<LocationSample> {
    return sample;
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

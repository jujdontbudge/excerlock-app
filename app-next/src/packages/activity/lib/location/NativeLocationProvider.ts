import type { NativeLocationClient } from "./NativeLocationClient";
import { assertGymRegionsAllowed } from "./gymRegions";
import { AppState } from 'react-native';
import { confirmGymCheckIn } from '../../GymCheckIn';
import { gymFixStatus, GYM_CONFIRM_RECHECK_MS } from '../../gymFix';
import { gymVisitLogEpoch } from '../../AsyncStorageGymVisitLog';
import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationProvider,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

export class NativeLocationProvider implements LocationProvider {
  private readonly authorizationCallbacks =
    new Set<(status: LocationAuthorizationStatus) => void>();
  private readonly locationCallbacks =
    new Set<(sample: LocationSample) => void>();
  private readonly manualCheckIns = new Set<string>();
  private readonly manualRegions = new Map<string, { region: GeofenceRegion; epoch: number }>();
  private foregroundTimer: ReturnType<typeof setInterval> | undefined;
  private sampling = false;
  private readonly appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') this.startForegroundSampling();
    else if (this.foregroundTimer) { clearInterval(this.foregroundTimer); this.foregroundTimer = undefined; }
  });
  private readonly monitoredRegions = new Map<string, GeofenceRegion>();
  private readonly presence = new Map<string, boolean>();
  private readonly regionCallbacks =
    new Set<(transition: RegionTransition) => void>();
  private readonly unsubscribeClient: readonly LocationUnsubscribe[];
  private readonly ready: Promise<void>;
  private authorizationStatus: LocationAuthorizationStatus;
  private lastLocation: LocationSample | null;

  public constructor(private readonly client: NativeLocationClient) {
    this.authorizationStatus = client.getAuthorizationStatus();
    this.lastLocation = client.getLastLocation();
    this.ready = client.hydrateState().then(() => {
      this.updateAuthorization(client.getAuthorizationStatus());
      this.lastLocation = client.getLastLocation();
    });
    this.unsubscribeClient = [
      client.onRegionPresence((transition) => {
        this.presence.set(transition.regionId, transition.type === "enter");
      }),
      client.onRegionTransition((transition) => {
        if (
          this.monitoredRegions.has(transition.regionId) ||
          this.manualCheckIns.has(transition.regionId)
        ) {
          this.regionCallbacks.forEach((callback) => callback(transition));
        }
      }),
      client.onLocation((sample) => {
        this.lastLocation = sample;
        this.locationCallbacks.forEach((callback) => callback(sample));
      }),
    ];
  }

  public async requestAuthorization(): Promise<LocationAuthorizationStatus> {
    await this.ready;
    return this.updateAuthorization(
      await this.client.requestForegroundAuthorization(),
    );
  }

  public async requestAlwaysAuthorization(): Promise<LocationAuthorizationStatus> {
    await this.ready;
    const foreground =
      this.authorizationStatus === "authorizedWhenInUse" ||
      this.authorizationStatus === "authorizedAlways"
        ? this.authorizationStatus
        : await this.requestAuthorization();
    if (foreground !== "authorizedWhenInUse") {
      return foreground;
    }
    return this.updateAuthorization(
      await this.client.requestBackgroundAuthorization(),
    );
  }

  public getAuthorizationStatus(): LocationAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async refreshAuthorization(): Promise<LocationAuthorizationStatus> {
    await this.ready;
    await this.client.hydrateState();
    return this.updateAuthorization(this.client.getAuthorizationStatus());
  }

  public async startMonitoringRegions(
    regions: readonly GeofenceRegion[],
  ): Promise<void> {
    await this.ready;
    assertGymRegionsAllowed(regions);
    const foregroundAuthorization =
      this.authorizationStatus === "authorizedWhenInUse" ||
      this.authorizationStatus === "authorizedAlways"
        ? this.authorizationStatus
        : await this.requestAuthorization();
    if (
      foregroundAuthorization !== "authorizedWhenInUse" &&
      foregroundAuthorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for auto-detect");
    }
    const authorization =
      foregroundAuthorization === "authorizedAlways"
        ? foregroundAuthorization
        : await this.client.requestBackgroundAuthorization();
    this.updateAuthorization(authorization);
    if (authorization !== "authorizedAlways") {
      throw new Error("Always location authorization is required for auto-detect");
    }

    await this.client.startGeofencing(regions);
    this.monitoredRegions.clear();
    regions.forEach((region) => {
      this.monitoredRegions.set(region.id, region);
      const cachedPresence = this.client.getCachedRegionPresence(region.id);
      if (cachedPresence !== null) {
        this.presence.set(region.id, cachedPresence);
      }
    });
  }

  public async stopMonitoringRegions(
    regionIds?: readonly string[],
  ): Promise<void> {
    await this.ready;
    if (regionIds === undefined) {
      await this.client.stopGeofencing();
      this.monitoredRegions.clear();
      this.presence.clear();
      return;
    }

    regionIds.forEach((regionId) => {
      this.monitoredRegions.delete(regionId);
      this.presence.delete(regionId);
    });
    const remainingRegions = [...this.monitoredRegions.values()];
    if (remainingRegions.length === 0) {
      await this.client.stopGeofencing();
    } else {
      await this.client.startGeofencing(remainingRegions);
    }
  }

  public isInsideRegion(regionId: string): boolean | null {
    return this.presence.get(regionId) ?? null;
  }

  public getLastLocation(): LocationSample | null {
    return this.lastLocation;
  }

  public async locateForGymSetup(): Promise<LocationSample> {
    const authorization = await this.requestAuthorization();
    if (
      authorization !== "authorizedWhenInUse" &&
      authorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required to save a gym");
    }
    const sample = await this.client.getCurrentLocation();
    this.lastLocation = sample;
    this.locationCallbacks.forEach((callback) => callback(sample));
    return sample;
  }

  public async checkIn(region: GeofenceRegion, confirmation?: { milliseconds: number; signal: AbortSignal }): Promise<boolean> {
    assertGymRegionsAllowed([region]);
    const epoch = await gymVisitLogEpoch();
    this.manualCheckIns.add(region.id);
    try {
      await confirmGymCheckIn({ gym: region, confirmation,
        read: async () => { const sample = await this.locateForGymSetup(); return { latitude: sample.lat, longitude: sample.lon, accuracy: sample.accuracy, atMs: sample.atMs }; },
        transition: async (type, atMs) => {
          await this.client.confirmRegionPresence({ type, regionId: region.id, atMs, manualEpoch: epoch });
          if (type === 'enter') this.manualRegions.set(region.id, { region, epoch });
          else this.manualRegions.delete(region.id);
        },
      });
      this.startForegroundSampling();
      return this.presence.get(region.id) === true;
    } finally { this.manualCheckIns.delete(region.id); }
  }

  public async recheck(region: GeofenceRegion): Promise<void> {
    const sample = await this.locateForGymSetup();
    const status = gymFixStatus({ latitude: sample.lat, longitude: sample.lon, accuracy: sample.accuracy, atMs: sample.atMs }, region);
    if (status === 'uncertain') return;
    const epoch = await gymVisitLogEpoch();
    this.manualCheckIns.add(region.id);
    try {
      await this.client.confirmRegionPresence({ type: status === 'inside' ? 'enter' : 'exit', regionId: region.id, atMs: Date.now(), manualEpoch: epoch });
      if (status === 'inside') this.manualRegions.set(region.id, { region, epoch });
      else this.manualRegions.delete(region.id);
    } finally { this.manualCheckIns.delete(region.id); }
    this.startForegroundSampling();
  }

  private startForegroundSampling(): void {
    if (this.foregroundTimer || AppState.currentState !== 'active' || !this.manualRegions.size) return;
    this.foregroundTimer = setInterval(() => {
      if (this.sampling) return;
      this.sampling = true;
      void this.locateForGymSetup().then(async (sample) => {
        for (const [id, { region, epoch }] of this.manualRegions) {
          const status = gymFixStatus({ latitude: sample.lat, longitude: sample.lon, accuracy: sample.accuracy, atMs: sample.atMs }, region);
          if (status === 'outside') {
            this.manualCheckIns.add(id);
            try { await this.client.confirmRegionPresence({ type: 'exit', regionId: id, atMs: Date.now(), manualEpoch: epoch }); }
            finally { this.manualCheckIns.delete(id); this.manualRegions.delete(id); }
          }
        }
        if (!this.manualRegions.size && this.foregroundTimer) { clearInterval(this.foregroundTimer); this.foregroundTimer = undefined; }
      }).catch(() => undefined).finally(() => { this.sampling = false; });
    }, GYM_CONFIRM_RECHECK_MS);
  }

  public async startWalkKeepAlive(): Promise<void> {
    await this.ready;
    const authorization =
      this.authorizationStatus === "authorizedWhenInUse" ||
      this.authorizationStatus === "authorizedAlways"
        ? this.authorizationStatus
        : await this.requestAuthorization();
    if (
      authorization !== "authorizedWhenInUse" &&
      authorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for walk keep-alive");
    }
    await this.client.startLocationUpdates();
  }

  public async stopWalkKeepAlive(): Promise<void> {
    await this.ready;
    await this.client.stopLocationUpdates();
  }

  public isWalkKeepAliveActive(): boolean {
    return this.client.isLocationUpdatesActive();
  }

  public on(
    event: "region",
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe;
  public on(
    event: "location",
    callback: (sample: LocationSample) => void,
  ): LocationUnsubscribe;
  public on(
    event: "authorization",
    callback: (status: LocationAuthorizationStatus) => void,
  ): LocationUnsubscribe;
  public on(
    event: "region" | "location" | "authorization",
    callback:
      | ((transition: RegionTransition) => void)
      | ((sample: LocationSample) => void)
      | ((status: LocationAuthorizationStatus) => void),
  ): LocationUnsubscribe {
    if (event === "region") {
      const regionCallback = callback as (transition: RegionTransition) => void;
      this.regionCallbacks.add(regionCallback);
      return () => this.regionCallbacks.delete(regionCallback);
    }
    if (event === "location") {
      const locationCallback = callback as (sample: LocationSample) => void;
      this.locationCallbacks.add(locationCallback);
      return () => this.locationCallbacks.delete(locationCallback);
    }
    const authorizationCallback = callback as (
      status: LocationAuthorizationStatus,
    ) => void;
    this.authorizationCallbacks.add(authorizationCallback);
    return () => this.authorizationCallbacks.delete(authorizationCallback);
  }

  public dispose(): void {
    this.appState.remove();
    if (this.foregroundTimer) clearInterval(this.foregroundTimer);
    this.unsubscribeClient.forEach((unsubscribe) => unsubscribe());
    this.authorizationCallbacks.clear();
    this.locationCallbacks.clear();
    this.regionCallbacks.clear();
  }

  private updateAuthorization(
    status: LocationAuthorizationStatus,
  ): LocationAuthorizationStatus {
    if (status !== this.authorizationStatus) {
      this.authorizationStatus = status;
      this.authorizationCallbacks.forEach((callback) => callback(status));
    }
    return status;
  }
}

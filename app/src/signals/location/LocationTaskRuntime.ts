import { GeofenceEventProcessor } from "./GeofenceEventProcessor";
import type { GymVisitLog } from "./GymVisitLog";
import type {
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

export type GeofencingTaskData = {
  readonly eventType?: number;
  readonly region?: {
    readonly identifier?: string;
    readonly latitude?: number;
    readonly longitude?: number;
    readonly radius?: number;
  };
};

export type LocationTaskData = {
  readonly locations?: readonly {
    readonly coords: {
      readonly accuracy: number | null;
      readonly latitude: number;
      readonly longitude: number;
    };
    readonly timestamp: number;
  }[];
};

/** Shared state between Task Manager callbacks and the foreground adapter. */
export class LocationTaskRuntime {
  private readonly locationListeners =
    new Set<(sample: LocationSample) => void>();
  private readonly presenceListeners =
    new Set<(transition: RegionTransition) => void>();
  private readonly regionListeners =
    new Set<(transition: RegionTransition) => void>();
  private readonly processor: GeofenceEventProcessor;
  private lastLocation: LocationSample | null = null;

  public constructor(log: GymVisitLog) {
    this.processor = new GeofenceEventProcessor({
      log,
      onPresence: (transition) => {
        this.presenceListeners.forEach((listener) => listener(transition));
      },
      onTransition: (transition) => {
        this.regionListeners.forEach((listener) => listener(transition));
      },
    });
  }

  public handleGeofencingTask(data: GeofencingTaskData): Promise<void> {
    const regionId = data.region?.identifier;
    if (regionId === undefined || (data.eventType !== 1 && data.eventType !== 2)) {
      return Promise.resolve();
    }
    return this.confirmRegionPresence({
      type: data.eventType === 1 ? "enter" : "exit",
      regionId,
      atMs: Date.now(),
    });
  }

  public confirmRegionPresence(transition: RegionTransition): Promise<void> {
    return this.processor.process(transition);
  }

  public handleLocationTask(data: LocationTaskData): void {
    data.locations?.forEach((location) => {
      if (location.coords.accuracy === null) {
        return;
      }
      const sample: LocationSample = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy,
        atMs: location.timestamp,
      };
      this.lastLocation = sample;
      this.locationListeners.forEach((listener) => listener(sample));
    });
  }

  public getLastLocation(): LocationSample | null {
    return this.lastLocation;
  }

  public getCachedRegionPresence(regionId: string): boolean | null {
    return this.processor.isInside(regionId);
  }

  public onRegionPresence(
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  public onRegionTransition(
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe {
    this.regionListeners.add(callback);
    return () => this.regionListeners.delete(callback);
  }

  public onLocation(
    callback: (sample: LocationSample) => void,
  ): LocationUnsubscribe {
    this.locationListeners.add(callback);
    return () => this.locationListeners.delete(callback);
  }
}

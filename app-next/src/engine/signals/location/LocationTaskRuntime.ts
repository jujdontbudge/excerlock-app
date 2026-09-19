import { GeofenceEventProcessor } from "./GeofenceEventProcessor";
import type { GymVisitLog } from "./GymVisitLog";
import type {
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

const EXPO_GEOFENCE_EVENT = {
  enter: 1,
  exit: 2,
} as const;

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
      /** expo-location exports CLLocation.speed (m/s) and course (as `heading`, degrees); -1 means unknown. */
      readonly speed?: number | null;
      readonly heading?: number | null;
    };
    readonly timestamp: number;
  }[];
};

/** Core Location's "unknown" sentinel is a negative value; expose it as null. */
const knownOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

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
    if (
      regionId === undefined ||
      (data.eventType !== EXPO_GEOFENCE_EVENT.enter &&
        data.eventType !== EXPO_GEOFENCE_EVENT.exit)
    ) {
      return Promise.resolve();
    }
    return this.confirmRegionPresence({
      type: data.eventType === EXPO_GEOFENCE_EVENT.enter ? "enter" : "exit",
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
        speedMps: knownOrNull(location.coords.speed),
        courseDeg: knownOrNull(location.coords.heading),
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

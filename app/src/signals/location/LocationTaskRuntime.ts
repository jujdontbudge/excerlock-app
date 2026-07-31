import { GeofenceEventProcessor } from "./GeofenceEventProcessor";
import type { GymVisitLog } from "./GymVisitLog";
import type { LocationUnsubscribe, RegionTransition } from "./LocationProvider";

export type GeofencingTaskData = {
  readonly eventType?: number;
  readonly region?: {
    readonly identifier?: string;
  };
};

/** Shared state between Task Manager callbacks and the foreground adapter. */
export class LocationTaskRuntime {
  private readonly presenceListeners =
    new Set<(transition: RegionTransition) => void>();
  private readonly regionListeners =
    new Set<(transition: RegionTransition) => void>();
  private readonly processor: GeofenceEventProcessor;

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
    return this.processor.process({
      type: data.eventType === 1 ? "enter" : "exit",
      regionId,
      atMs: Date.now(),
    });
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
}

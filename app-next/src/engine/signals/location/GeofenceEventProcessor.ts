import type { GymVisitLog } from "./GymVisitLog";
import type { RegionTransition } from "./LocationProvider";

export const PRESENCE_CONFIRMATION_MS = 30_000;

type PendingConfirmation = {
  readonly promise: Promise<void>;
  readonly reject: (error: unknown) => void;
  readonly resolve: () => void;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly transition: RegionTransition;
};

type GeofenceEventProcessorOptions = {
  readonly log: GymVisitLog;
  readonly onPresence: (transition: RegionTransition) => void;
  readonly onTransition: (transition: RegionTransition) => void;
};

/** Converts noisy raw region events into confirmed, coordinate-free visits. */
export class GeofenceEventProcessor {
  private readonly confirmedPresence = new Map<string, boolean>();
  private readonly pending = new Map<string, PendingConfirmation>();
  private readonly rawPresence = new Map<string, boolean>();

  public constructor(private readonly options: GeofenceEventProcessorOptions) {}

  public process(transition: RegionTransition): Promise<void> {
    const inside = transition.type === "enter";
    this.rawPresence.set(transition.regionId, inside);
    this.options.onPresence(transition);

    if (inside) {
      if (this.confirmedPresence.get(transition.regionId) === true) {
        return Promise.resolve();
      }
      const existing = this.pending.get(transition.regionId);
      if (existing !== undefined) {
        return existing.promise;
      }
      return this.scheduleConfirmation(transition);
    }

    const pending = this.pending.get(transition.regionId);
    if (pending !== undefined) {
      clearTimeout(pending.timer);
      this.pending.delete(transition.regionId);
      pending.resolve();
      return Promise.resolve();
    }
    if (this.confirmedPresence.get(transition.regionId) === true) {
      this.confirmedPresence.set(transition.regionId, false);
      // The exit closes the interval the arrival opened before anything is
      // told about it, so a reader can never see a stay that has no end.
      return this.options.log
        .close(transition.regionId, transition.atMs)
        .then(() => {
          this.options.onTransition(transition);
        });
    }
    return Promise.resolve();
  }

  public isInside(regionId: string): boolean | null {
    return this.rawPresence.get(regionId) ?? null;
  }

  private scheduleConfirmation(transition: RegionTransition): Promise<void> {
    let resolve: () => void = () => undefined;
    let reject: (error: unknown) => void = () => undefined;
    const promise = new Promise<void>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    const timer = setTimeout(() => {
      void this.confirm(transition).catch((error: unknown) => {
        const pending = this.pending.get(transition.regionId);
        if (pending?.transition === transition) {
          this.pending.delete(transition.regionId);
          pending.reject(error);
        }
      });
    }, PRESENCE_CONFIRMATION_MS);
    this.pending.set(transition.regionId, {
      promise,
      reject,
      resolve,
      timer,
      transition,
    });
    return promise;
  }

  private async confirm(transition: RegionTransition): Promise<void> {
    const pending = this.pending.get(transition.regionId);
    if (
      pending?.transition !== transition ||
      this.rawPresence.get(transition.regionId) !== true
    ) {
      return;
    }

    await this.options.log.open(transition.regionId, transition.atMs);
    this.confirmedPresence.set(transition.regionId, true);
    this.options.onTransition(transition);
    this.pending.delete(transition.regionId);
    pending.resolve();
  }
}

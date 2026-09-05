import type { GymVisitLog } from "./GymVisitLog";
import type { RegionTransition } from "./LocationProvider";
import type { PendingRegionEntryLog } from "./PendingRegionEntryLog";
import { hasDwelled, PRESENCE_CONFIRMATION_MS } from "./presenceDwell";

export { PRESENCE_CONFIRMATION_MS };

type PendingConfirmation = {
  readonly promise: Promise<void>;
  readonly reject: (error: unknown) => void;
  readonly resolve: () => void;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly transition: RegionTransition;
};

type Outcome = {
  /** Resolves once the event is on disk; safe to return to a background wake. */
  readonly durable: Promise<void>;
  /** Resolves once the dwell has been decided; needs the process to stay alive. */
  readonly settled: Promise<void>;
};

type GeofenceEventProcessorOptions = {
  readonly entries: PendingRegionEntryLog;
  readonly log: GymVisitLog;
  readonly onPresence: (transition: RegionTransition) => void;
  readonly onTransition: (transition: RegionTransition) => void;
};

/**
 * Converts noisy raw region events into confirmed, coordinate-free visits.
 *
 * The dwell lives in `entries`, not in the timer: the enter is persisted before
 * anything else, and the visit is booked by whichever path first takes that
 * entry back — the matching exit, the foreground timer, or the next claim. A
 * process that is suspended ten seconds into the thirty loses only its timer.
 */
export class GeofenceEventProcessor {
  private readonly confirmedPresence = new Map<string, boolean>();
  private readonly pending = new Map<string, PendingConfirmation>();
  private readonly rawPresence = new Map<string, boolean>();

  public constructor(private readonly options: GeofenceEventProcessorOptions) {}

  /** Foreground path: resolves when the dwell has been decided. */
  public process(transition: RegionTransition): Promise<void> {
    return this.accept(transition).settled;
  }

  /** Background path: resolves as soon as the event survives suspension. */
  public receive(transition: RegionTransition): Promise<void> {
    const { durable, settled } = this.accept(transition);
    settled.catch(() => undefined);
    return durable;
  }

  public isInside(regionId: string): boolean | null {
    return this.rawPresence.get(regionId) ?? null;
  }

  private accept(transition: RegionTransition): Outcome {
    const inside = transition.type === "enter";
    this.rawPresence.set(transition.regionId, inside);
    this.options.onPresence(transition);

    if (!inside) {
      const exited = this.exit(transition);
      return { durable: exited, settled: exited };
    }
    if (this.confirmedPresence.get(transition.regionId) === true) {
      return { durable: Promise.resolve(), settled: Promise.resolve() };
    }
    const open = this.pending.get(transition.regionId);
    if (open !== undefined) {
      return { durable: Promise.resolve(), settled: open.promise };
    }

    const durable = this.options.entries.record({
      regionId: transition.regionId,
      atMs: transition.atMs,
    });
    return { durable, settled: this.scheduleConfirmation(transition, durable) };
  }

  private scheduleConfirmation(
    transition: RegionTransition,
    durable: Promise<void>,
  ): Promise<void> {
    let resolve: () => void = () => undefined;
    let reject: (error: unknown) => void = () => undefined;
    const promise = new Promise<void>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    const timer = setTimeout(() => {
      void this.confirm(transition).catch((error: unknown) => {
        this.abandon(transition, error);
      });
    }, PRESENCE_CONFIRMATION_MS);
    this.pending.set(transition.regionId, {
      promise,
      reject,
      resolve,
      timer,
      transition,
    });
    durable.catch((error: unknown) => {
      this.abandon(transition, error);
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

    const entry = await this.options.entries.take(transition.regionId);
    if (entry !== null) {
      await this.options.log.append({
        regionId: entry.regionId,
        atMs: entry.atMs,
      });
      this.options.onTransition(transition);
    }
    this.confirmedPresence.set(transition.regionId, true);
    this.pending.delete(transition.regionId);
    pending.resolve();
  }

  private async exit(transition: RegionTransition): Promise<void> {
    const pending = this.pending.get(transition.regionId);
    if (pending !== undefined) {
      clearTimeout(pending.timer);
      this.pending.delete(transition.regionId);
      pending.resolve();
    }

    const entry = await this.options.entries.take(transition.regionId);
    if (entry !== null && hasDwelled(entry.atMs, transition.atMs)) {
      await this.options.log.append({
        regionId: entry.regionId,
        atMs: entry.atMs,
      });
      this.options.onTransition({
        type: "enter",
        regionId: entry.regionId,
        atMs: entry.atMs,
      });
    }

    if (this.confirmedPresence.get(transition.regionId) === true) {
      this.confirmedPresence.set(transition.regionId, false);
      this.options.onTransition(transition);
    }
  }

  private abandon(transition: RegionTransition, error: unknown): void {
    const pending = this.pending.get(transition.regionId);
    if (pending?.transition !== transition) {
      return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(transition.regionId);
    pending.reject(error);
  }
}

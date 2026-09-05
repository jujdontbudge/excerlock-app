import type { GymVisit, ReadableGymVisitLog } from "./GymVisitLog";
import type { PendingRegionEntryLog } from "./PendingRegionEntryLog";
import { settlePendingDwells } from "./settlePendingDwells";

type ConfirmedGymVisitsOptions = {
  readonly entries: PendingRegionEntryLog;
  readonly log: ReadableGymVisitLog;
  readonly now: () => number;
};

/**
 * What the app-open claim reads. Reading settles first: an enter the OS handed
 * to a background wake that was suspended before its dwell elapsed becomes a
 * visit here, the first time the app is alive long enough to look.
 */
export class ConfirmedGymVisits {
  public constructor(private readonly options: ConfirmedGymVisitsOptions) {}

  public async readAll(): Promise<readonly GymVisit[]> {
    await settlePendingDwells({
      entries: this.options.entries,
      log: this.options.log,
      nowMs: this.options.now(),
    });
    return this.options.log.readAll();
  }
}

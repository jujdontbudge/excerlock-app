import type { GymVisit, GymVisitLog } from "./GymVisitLog";
import type { PendingRegionEntryLog } from "./PendingRegionEntryLog";
import { PRESENCE_CONFIRMATION_MS } from "./presenceDwell";

type SettleOptions = {
  readonly entries: PendingRegionEntryLog;
  readonly log: GymVisitLog;
  readonly nowMs: number;
};

/**
 * Books every enter that reached its dwell without the app being awake to see
 * it. An exit inside the dwell already removed the entry, so anything still
 * open at `nowMs` is an arrival nobody has been paid for yet.
 */
export async function settlePendingDwells(
  options: SettleOptions,
): Promise<readonly GymVisit[]> {
  const elapsed = await options.entries.takeElapsed(
    options.nowMs,
    PRESENCE_CONFIRMATION_MS,
  );
  const settled: GymVisit[] = [];
  for (const entry of elapsed) {
    const visit: GymVisit = { regionId: entry.regionId, atMs: entry.atMs };
    await options.log.append(visit);
    settled.push(visit);
  }
  return settled;
}

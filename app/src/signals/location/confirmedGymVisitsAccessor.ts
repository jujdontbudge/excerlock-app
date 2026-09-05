import type { ConfirmedGymVisits } from "./ConfirmedGymVisits";

/** Keeps AsyncStorage out of the broad SignalKit public-surface import path. */
export function createConfirmedGymVisits(): ConfirmedGymVisits {
  const { AsyncStorageGymVisitLog } = require(
    "./AsyncStorageGymVisitLog"
  ) as typeof import("./AsyncStorageGymVisitLog");
  const { AsyncStoragePendingRegionEntryLog } = require(
    "./AsyncStoragePendingRegionEntryLog"
  ) as typeof import("./AsyncStoragePendingRegionEntryLog");
  const { ConfirmedGymVisits: Visits } = require(
    "./ConfirmedGymVisits"
  ) as typeof import("./ConfirmedGymVisits");
  return new Visits({
    entries: new AsyncStoragePendingRegionEntryLog(),
    log: new AsyncStorageGymVisitLog(),
    now: () => Date.now(),
  });
}

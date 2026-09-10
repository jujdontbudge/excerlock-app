import type { AsyncStorageGymVisitLog } from "./AsyncStorageGymVisitLog";

/** Keeps AsyncStorage out of the broad SignalKit public-surface import path. */
export function createAsyncStorageGymVisitLog(): AsyncStorageGymVisitLog {
  const { AsyncStorageGymVisitLog } = require(
    "./AsyncStorageGymVisitLog"
  ) as typeof import("./AsyncStorageGymVisitLog");
  return new AsyncStorageGymVisitLog();
}

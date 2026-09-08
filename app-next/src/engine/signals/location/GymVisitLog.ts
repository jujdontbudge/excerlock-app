/**
 * One confirmed stay at a saved gym. `exitedAt` is null while the visit is
 * still open, so dwell for an open visit runs to `now` rather than to zero.
 */
export interface GymVisitInterval {
  readonly regionId: string;
  readonly enteredAt: number;
  readonly exitedAt: number | null;
}

/**
 * On-device-only sink for confirmed gym visits.
 *
 * The log records intervals rather than arrival points: a confirmed exit has to
 * close the interval it opened, or a locker-room hour with the app killed reads
 * as a single instant and credits nothing (P2-T15 §3). Both calls are
 * idempotent — opening an already-open region and closing a region with no open
 * interval are both no-ops — because geofence callbacks repeat.
 */
export interface GymVisitLog {
  open(regionId: string, atMs: number): Promise<void>;
  close(regionId: string, atMs: number): Promise<void>;
}

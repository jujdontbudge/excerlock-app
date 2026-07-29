import type { HomeSignalFeed } from "../signals/homeSignalFeed";
import { EMPTY_READING, type SignalReading } from "../model/reading";

/** A feed that reports one fixed reading — screen tests drive state, not time. */
export function stubFeed(reading: SignalReading = EMPTY_READING): HomeSignalFeed {
  return {
    start: async () => undefined,
    read: async () => reading,
    subscribe: () => () => undefined,
    dispose: () => undefined,
  };
}

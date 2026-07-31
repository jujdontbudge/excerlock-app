export interface GymVisit {
  readonly regionId: string;
  readonly atMs: number;
}

/** On-device-only sink for confirmed gym arrivals. */
export interface GymVisitLog {
  append(visit: GymVisit): Promise<void>;
}

export interface GymVisit {
  readonly regionId: string;
  readonly atMs: number;
}

/** On-device-only sink for confirmed gym arrivals. */
export interface GymVisitLog {
  append(visit: GymVisit): Promise<void>;
}

/** A visit log the app-open claim can read back. */
export interface ReadableGymVisitLog extends GymVisitLog {
  readAll(): Promise<readonly GymVisit[]>;
}

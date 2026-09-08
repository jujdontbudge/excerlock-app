import type { JsonValue } from "../timeline";

export type HealthSignal =
  | "steps"
  | "activeEnergy"
  | "appleExerciseTime"
  | "walkingRunningDistance"
  | "cyclingDistance"
  | "swimmingDistance"
  | "workout";

export type HealthAuthorizationStatus =
  | "notDetermined"
  | "restricted"
  | "denied"
  | "authorized";

export interface HealthSample {
  readonly value: number;
  readonly startISO: string;
  readonly endISO: string;
  readonly sourceRevision: JsonValue;
  readonly wasUserEntered: boolean;
}

export interface AnchoredHealthSamples {
  readonly samples: readonly HealthSample[];
  readonly anchor: string;
}

export interface HealthChange {
  readonly signal: HealthSignal;
  readonly reason: "samplesAdded" | "backgroundWake";
  readonly samples: readonly HealthSample[];
}

export type HealthUnsubscribe = () => void;

export interface HealthProvider {
  requestAuth(): Promise<HealthAuthorizationStatus>;
  getAuthorizationStatus(): HealthAuthorizationStatus;
  getNewSamples(
    signal: HealthSignal,
    sinceAnchor: string | null,
  ): Promise<AnchoredHealthSamples>;
  getTodayTotal(signal: HealthSignal): Promise<number>;
  onChange(
    signal: HealthSignal,
    callback: (change: HealthChange) => void,
  ): HealthUnsubscribe;
  onAuthorizationChange(
    callback: (status: HealthAuthorizationStatus) => void,
  ): HealthUnsubscribe;
}

import {
  assertExactPayloadKeys,
  type FixtureManifest,
  type TimelineRow,
} from "../timeline";
import type {
  HealthAuthorizationStatus,
  HealthSample,
  HealthSignal,
} from "./HealthProvider";

export const HEALTH_SIGNALS = [
  "steps",
  "activeEnergy",
  "appleExerciseTime",
  "walkingRunningDistance",
  "cyclingDistance",
  "swimmingDistance",
  "workout",
] as const satisfies readonly HealthSignal[];

export const HEALTH_FIXTURE_EVENTS = [
  "health.samplesAdded",
  "health.backgroundWake",
  "health.authChanged",
] as const;

export type HealthFixtureEvent = (typeof HEALTH_FIXTURE_EVENTS)[number];

export interface HealthSamplesAddedPayload {
  readonly signal: HealthSignal;
  readonly samples: readonly HealthSample[];
}

export interface HealthBackgroundWakePayload {
  readonly signal: HealthSignal;
}

export interface HealthAuthChangedPayload {
  readonly status: HealthAuthorizationStatus;
}

export type HealthFixturePayload =
  | HealthSamplesAddedPayload
  | HealthBackgroundWakePayload
  | HealthAuthChangedPayload;

export type HealthTimelineRow =
  | TimelineRow<"health.samplesAdded", HealthSamplesAddedPayload>
  | TimelineRow<"health.backgroundWake", HealthBackgroundWakePayload>
  | TimelineRow<"health.authChanged", HealthAuthChangedPayload>;

export interface HealthFixtureManifest
  extends Omit<
    FixtureManifest<HealthFixtureEvent, HealthFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly HealthTimelineRow[];
}

function isHealthSignal(value: unknown): value is HealthSignal {
  return HEALTH_SIGNALS.includes(value as HealthSignal);
}

export function assertHealthSamplesPayload(
  payload: HealthFixturePayload,
): asserts payload is HealthSamplesAddedPayload {
  const candidate = payload as Partial<HealthSamplesAddedPayload>;
  if (!isHealthSignal(candidate.signal) || !Array.isArray(candidate.samples)) {
    throw new Error("Invalid payload for health.samplesAdded");
  }
  candidate.samples.forEach((sample) => {
    assertExactPayloadKeys(
      sample,
      [
        "value",
        "startISO",
        "endISO",
        "sourceRevision",
        "wasUserEntered",
      ],
      "health.samplesAdded sample",
    );
    if (
      typeof sample.value !== "number" ||
      !Number.isFinite(sample.value) ||
      typeof sample.startISO !== "string" ||
      typeof sample.endISO !== "string" ||
      typeof sample.wasUserEntered !== "boolean"
    ) {
      throw new Error("Invalid sample in health.samplesAdded");
    }
  });
}

export function assertHealthWakePayload(
  payload: HealthFixturePayload,
): asserts payload is HealthBackgroundWakePayload {
  if (!isHealthSignal((payload as Partial<HealthBackgroundWakePayload>).signal)) {
    throw new Error("Invalid payload for health.backgroundWake");
  }
}

export function assertHealthAuthPayload(
  payload: HealthFixturePayload,
): asserts payload is HealthAuthChangedPayload {
  const status = (payload as Partial<HealthAuthChangedPayload>).status;
  if (
    !["notDetermined", "restricted", "denied", "authorized"].includes(
      status ?? "",
    )
  ) {
    throw new Error("Invalid payload for health.authChanged");
  }
}

export function validateHealthFixtureRow(
  row: TimelineRow<HealthFixtureEvent, HealthFixturePayload>,
): void {
  if (row.event === "health.samplesAdded") {
    assertExactPayloadKeys(row.payload, ["signal", "samples"], row.event);
    assertHealthSamplesPayload(row.payload);
  } else if (row.event === "health.backgroundWake") {
    assertExactPayloadKeys(row.payload, ["signal"], row.event);
    assertHealthWakePayload(row.payload);
  } else {
    assertExactPayloadKeys(row.payload, ["status"], row.event);
    assertHealthAuthPayload(row.payload);
  }
}

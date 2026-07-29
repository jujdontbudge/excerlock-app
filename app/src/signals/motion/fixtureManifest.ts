import {
  assertExactPayloadKeys,
  type FixtureManifest,
  type TimelineRow,
} from "../timeline";
import type { MotionConfidence } from "./MotionProvider";

export const MOTION_FIXTURE_EVENTS = [
  "motion.activityChange",
  "motion.pedometerUpdate",
  "motion.authDenied",
] as const;

export type MotionFixtureEvent = (typeof MOTION_FIXTURE_EVENTS)[number];

export interface MotionActivityChangePayload {
  readonly activity: "walking" | "stationary" | "automotive";
  readonly confidence: MotionConfidence;
}

export interface MotionPedometerUpdatePayload {
  readonly steps: number;
  readonly cadence: number | null;
}

export type MotionFixturePayload =
  | MotionActivityChangePayload
  | MotionPedometerUpdatePayload
  | Record<string, never>;

export type MotionTimelineRow =
  | TimelineRow<"motion.activityChange", MotionActivityChangePayload>
  | TimelineRow<"motion.pedometerUpdate", MotionPedometerUpdatePayload>
  | TimelineRow<"motion.authDenied", Record<string, never>>;

export interface MotionFixtureManifest
  extends Omit<
    FixtureManifest<MotionFixtureEvent, MotionFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly MotionTimelineRow[];
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function assertMotionActivityPayload(
  payload: MotionFixturePayload,
): asserts payload is MotionActivityChangePayload {
  const candidate = payload as Partial<MotionActivityChangePayload>;
  if (
    !["walking", "stationary", "automotive"].includes(
      candidate.activity ?? "",
    ) ||
    !["low", "medium", "high"].includes(candidate.confidence ?? "")
  ) {
    throw new Error("Invalid payload for motion.activityChange");
  }
}

export function assertMotionPedometerPayload(
  payload: MotionFixturePayload,
): asserts payload is MotionPedometerUpdatePayload {
  const candidate = payload as Partial<MotionPedometerUpdatePayload>;
  if (
    !isFiniteNonNegative(candidate.steps) ||
    (candidate.cadence !== null && !isFiniteNonNegative(candidate.cadence))
  ) {
    throw new Error("Invalid payload for motion.pedometerUpdate");
  }
}

export function validateMotionFixtureRow(
  row: TimelineRow<MotionFixtureEvent, MotionFixturePayload>,
): void {
  if (row.event === "motion.activityChange") {
    assertExactPayloadKeys(row.payload, ["activity", "confidence"], row.event);
    assertMotionActivityPayload(row.payload);
  } else if (row.event === "motion.pedometerUpdate") {
    assertExactPayloadKeys(row.payload, ["steps", "cadence"], row.event);
    assertMotionPedometerPayload(row.payload);
  } else {
    assertExactPayloadKeys(row.payload, [], row.event);
  }
}

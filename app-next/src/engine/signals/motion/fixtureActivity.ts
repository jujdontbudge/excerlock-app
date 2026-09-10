import type { ActivitySample, MotionConfidence } from "./MotionProvider";
import {
  assertMotionActivityPayload,
  type MotionFixtureManifest,
} from "./fixtureManifest";

const CONFIDENCE_RANK: Readonly<Record<MotionConfidence, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function activitySampleAt(
  fixture: MotionFixtureManifest,
  atMs: number,
): ActivitySample {
  const rows = fixture.timeline.filter(
    (row) => row.event === "motion.activityChange" && row.atMs === atMs,
  );
  const classes = rows.map((row) => {
    assertMotionActivityPayload(row.payload);
    return row.payload.activity;
  });
  const confidence = rows.reduce<MotionConfidence>((highest, row) => {
    assertMotionActivityPayload(row.payload);
    return CONFIDENCE_RANK[row.payload.confidence] > CONFIDENCE_RANK[highest]
      ? row.payload.confidence
      : highest;
  }, "low");

  return {
    classes: [...new Set(classes)],
    confidence,
    startedAt: atMs,
    receivedAt: atMs,
  };
}

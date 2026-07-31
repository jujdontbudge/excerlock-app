import type { HealthSignal } from "./HealthProvider";
import type { HealthKitClient } from "./HealthKitClient";
import { HEALTHKIT_QUANTITIES } from "./healthKitSignalMapping";

export async function getHealthKitTodayTotal(
  client: HealthKitClient,
  signal: HealthSignal,
  now: Date,
): Promise<number> {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const query = { anchor: null, from, to: now } as const;

  if (signal === "appleExerciseTime") {
    const exerciseTime = await client.queryQuantity(
      HEALTHKIT_QUANTITIES.appleExerciseTime.type,
      HEALTHKIT_QUANTITIES.appleExerciseTime.unit,
      query,
    );
    const recordedExerciseTime = exerciseTime.samples.filter(
      (sample) => !sample.wasUserEntered,
    );
    return recordedExerciseTime.length > 0
      ? sumRecorded(recordedExerciseTime)
      : sumRecorded((await client.queryWorkouts(query)).samples);
  }

  if (signal === "workout") {
    return sumRecorded((await client.queryWorkouts(query)).samples);
  }

  const definition = HEALTHKIT_QUANTITIES[signal];
  return sumRecorded(
    (await client.queryQuantity(definition.type, definition.unit, query)).samples,
  );
}

function sumRecorded(
  samples: Awaited<ReturnType<HealthKitClient["queryWorkouts"]>>["samples"],
): number {
  return samples.reduce(
    (total, sample) =>
      sample.wasUserEntered ? total : total + sample.value,
    0,
  );
}

import type { HealthSignal } from "./HealthProvider";
import type {
  HealthKitObjectType,
  HealthKitQuantityType,
} from "./HealthKitClient";

type QuantityHealthSignal = Exclude<HealthSignal, "workout">;

export interface HealthKitQuantityDefinition {
  readonly type: HealthKitQuantityType;
  readonly unit: string;
}

export const HEALTHKIT_QUANTITIES: Readonly<
  Record<QuantityHealthSignal, HealthKitQuantityDefinition>
> = {
  steps: {
    type: "HKQuantityTypeIdentifierStepCount",
    unit: "count",
  },
  activeEnergy: {
    type: "HKQuantityTypeIdentifierActiveEnergyBurned",
    unit: "kcal",
  },
  appleExerciseTime: {
    type: "HKQuantityTypeIdentifierAppleExerciseTime",
    unit: "min",
  },
  walkingRunningDistance: {
    type: "HKQuantityTypeIdentifierDistanceWalkingRunning",
    unit: "km",
  },
  cyclingDistance: {
    type: "HKQuantityTypeIdentifierDistanceCycling",
    unit: "km",
  },
  swimmingDistance: {
    type: "HKQuantityTypeIdentifierDistanceSwimming",
    unit: "m",
  },
};

export const HEALTHKIT_WORKOUT_TYPE: HealthKitObjectType =
  "HKWorkoutTypeIdentifier";

export const HEALTHKIT_TYPES: readonly HealthKitObjectType[] = [
  ...Object.values(HEALTHKIT_QUANTITIES).map(({ type }) => type),
  HEALTHKIT_WORKOUT_TYPE,
];

export function quantityDefinition(
  signal: HealthSignal,
): HealthKitQuantityDefinition | undefined {
  return signal === "workout" ? undefined : HEALTHKIT_QUANTITIES[signal];
}

export function signalsChangedBy(
  type: HealthKitObjectType,
): readonly HealthSignal[] {
  if (type === HEALTHKIT_WORKOUT_TYPE) {
    return ["workout", "appleExerciseTime"];
  }
  const entry = Object.entries(HEALTHKIT_QUANTITIES).find(
    ([, definition]) => definition.type === type,
  );
  return entry === undefined ? [] : [entry[0] as QuantityHealthSignal];
}

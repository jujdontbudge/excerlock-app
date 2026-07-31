import type {
  HealthAuthorizationStatus,
  HealthSample,
  HealthUnsubscribe,
} from "./HealthProvider";

export type HealthKitObjectType =
  | "HKQuantityTypeIdentifierAppleExerciseTime"
  | "HKQuantityTypeIdentifierStepCount"
  | "HKWorkoutTypeIdentifier";

export interface HealthKitQuery {
  readonly anchor: string | null;
  readonly from?: Date;
  readonly to?: Date;
}

export interface HealthKitSamplePage {
  readonly samples: readonly HealthSample[];
  readonly anchor: string;
}

/** Narrow on-device boundary implemented by the Kingstinct HealthKit package. */
export interface HealthKitClient {
  getAuthorizationStatus(): HealthAuthorizationStatus;
  requestAuthorization(): Promise<HealthAuthorizationStatus>;
  configureBackgroundDelivery(
    types: readonly HealthKitObjectType[],
  ): Promise<void>;
  queryQuantity(
    identifier: HealthKitObjectType,
    unit: string,
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage>;
  queryWorkouts(query: HealthKitQuery): Promise<HealthKitSamplePage>;
  subscribe(
    type: HealthKitObjectType,
    callback: () => void,
  ): HealthUnsubscribe;
}

import type { JsonValue } from "../timeline";
import type { HealthAuthorizationStatus, HealthSample } from "./HealthProvider";
import type {
  HealthKitClient,
  HealthKitObjectType,
  HealthKitQuantityType,
  HealthKitQuery,
  HealthKitSamplePage,
} from "./HealthKitClient";
import { HEALTHKIT_TYPES } from "./healthKitSignalMapping";

/** Raw v14 enum value for HKUpdateFrequency.immediate. */
const IMMEDIATE_BACKGROUND_DELIVERY = 1;

interface KingstinctSourceRevision {
  readonly source: {
    readonly name: string;
    readonly bundleIdentifier: string;
  };
  readonly version?: string;
  readonly operatingSystemVersion: string;
  readonly productType?: string;
}

interface KingstinctSampleBase {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly sourceRevision: KingstinctSourceRevision;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface KingstinctQuantitySample extends KingstinctSampleBase {
  readonly quantity: number;
}

export interface KingstinctWorkoutSample extends KingstinctSampleBase {
  readonly duration: { readonly quantity: number };
}

interface KingstinctQueryOptions {
  readonly limit: number;
  readonly anchor?: string;
  readonly unit?: string;
  readonly filter?: {
    readonly date: {
      readonly startDate?: Date;
      readonly endDate?: Date;
      readonly strictStartDate: true;
      readonly strictEndDate: true;
    };
  };
}

export interface KingstinctHealthKitModule {
  isHealthDataAvailable(): boolean;
  requestAuthorization(options: {
    readonly toRead: readonly string[];
  }): Promise<boolean>;
  configureBackgroundTypes(
    typeIdentifiers: readonly string[],
    updateFrequency: number,
  ): Promise<boolean>;
  queryQuantitySamplesWithAnchor(
    identifier: string,
    options: KingstinctQueryOptions,
  ): Promise<{
    readonly samples: readonly KingstinctQuantitySample[];
    readonly newAnchor: string;
  }>;
  queryWorkoutSamplesWithAnchor(options: KingstinctQueryOptions): Promise<{
    readonly workouts: readonly KingstinctWorkoutSample[];
    readonly newAnchor: string;
  }>;
  subscribeToChanges(
    identifier: string,
    callback: (change: { readonly errorMessage?: string }) => void,
  ): { remove(): void };
}

export class KingstinctHealthKitClient implements HealthKitClient {
  private authorizationStatus: HealthAuthorizationStatus;

  public constructor(private readonly healthKit: KingstinctHealthKitModule) {
    this.authorizationStatus = healthKit.isHealthDataAvailable()
      ? "notDetermined"
      : "restricted";
  }

  public getAuthorizationStatus(): HealthAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async requestAuthorization(): Promise<HealthAuthorizationStatus> {
    if (this.authorizationStatus === "restricted") {
      return this.authorizationStatus;
    }
    const authorized = await this.healthKit.requestAuthorization({
      toRead: HEALTHKIT_TYPES,
    });
    this.authorizationStatus = authorized ? "authorized" : "denied";
    return this.authorizationStatus;
  }

  public async configureBackgroundDelivery(
    types: readonly HealthKitObjectType[],
  ): Promise<void> {
    await this.healthKit.configureBackgroundTypes(
      types,
      IMMEDIATE_BACKGROUND_DELIVERY,
    );
  }

  public async queryQuantity(
    identifier: HealthKitQuantityType,
    unit: string,
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage> {
    const result = await this.healthKit.queryQuantitySamplesWithAnchor(
      identifier,
      nativeQuery(query, unit),
    );
    return {
      samples: result.samples.map((sample) =>
        healthSample(sample.quantity, sample),
      ),
      anchor: result.newAnchor,
    };
  }

  public async queryWorkouts(
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage> {
    const result = await this.healthKit.queryWorkoutSamplesWithAnchor(
      nativeQuery(query),
    );
    return {
      samples: result.workouts.map((workout) =>
        healthSample(workout.duration.quantity / 60, workout),
      ),
      anchor: result.newAnchor,
    };
  }

  public subscribe(type: HealthKitObjectType, callback: () => void): () => void {
    const subscription = this.healthKit.subscribeToChanges(type, callback);
    return () => subscription.remove();
  }
}

/** Loads Nitro only when a dev-client composition root explicitly asks for it. */
export function createKingstinctHealthKitClient(): HealthKitClient {
  const healthKit = require(
    "@kingstinct/react-native-healthkit",
  ) as KingstinctHealthKitModule;
  return new KingstinctHealthKitClient(healthKit);
}

function nativeQuery(
  query: HealthKitQuery,
  unit?: string,
): KingstinctQueryOptions {
  const hasDateFilter = query.from !== undefined || query.to !== undefined;
  return {
    limit: 0,
    ...(query.anchor === null ? {} : { anchor: query.anchor }),
    ...(unit === undefined ? {} : { unit }),
    ...(hasDateFilter
      ? {
          filter: {
            date: {
              ...(query.from === undefined ? {} : { startDate: query.from }),
              ...(query.to === undefined ? {} : { endDate: query.to }),
              strictStartDate: true as const,
              strictEndDate: true as const,
            },
          },
        }
      : {}),
  };
}

function healthSample(
  value: number,
  sample: KingstinctSampleBase,
): HealthSample {
  return {
    value,
    startISO: sample.startDate.toISOString(),
    endISO: sample.endDate.toISOString(),
    sourceRevision: sourceRevision(sample.sourceRevision),
    wasUserEntered: sample.metadata.HKWasUserEntered === true,
  };
}

function sourceRevision(revision: KingstinctSourceRevision): JsonValue {
  return {
    name: revision.source.name,
    bundleIdentifier: revision.source.bundleIdentifier,
    operatingSystemVersion: revision.operatingSystemVersion,
    ...(revision.version === undefined ? {} : { version: revision.version }),
    ...(revision.productType === undefined
      ? {}
      : { productType: revision.productType }),
  };
}

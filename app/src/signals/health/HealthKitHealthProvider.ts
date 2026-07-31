import type {
  AnchoredHealthSamples,
  HealthAuthorizationStatus,
  HealthChange,
  HealthProvider,
  HealthSignal,
  HealthUnsubscribe,
} from "./HealthProvider";
import type {
  HealthKitClient,
  HealthKitObjectType,
} from "./HealthKitClient";

const STEPS_TYPE: HealthKitObjectType = "HKQuantityTypeIdentifierStepCount";
const EXERCISE_TIME_TYPE: HealthKitObjectType =
  "HKQuantityTypeIdentifierAppleExerciseTime";

export class HealthKitHealthProvider implements HealthProvider {
  private readonly authorizationCallbacks = new Set<
    (status: HealthAuthorizationStatus) => void
  >();
  private readonly changeCallbacks = new Map<
    HealthSignal,
    Set<(change: HealthChange) => void>
  >();
  private readonly latestAnchors = new Map<HealthSignal, string>();
  private readonly subscriptions = new Map<HealthKitObjectType, HealthUnsubscribe>();
  private authorizationStatus: HealthAuthorizationStatus;

  public constructor(
    private readonly client: HealthKitClient,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.authorizationStatus = client.getAuthorizationStatus();
  }

  public async requestAuth(): Promise<HealthAuthorizationStatus> {
    const status = await this.client.requestAuthorization();
    this.setAuthorizationStatus(status);
    if (status === "authorized") {
      await this.client.configureBackgroundDelivery([STEPS_TYPE]);
      this.reconcileSubscriptions();
    }
    return status;
  }

  public getAuthorizationStatus(): HealthAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async getNewSamples(
    signal: HealthSignal,
    sinceAnchor: string | null,
  ): Promise<AnchoredHealthSamples> {
    if (signal !== "steps") {
      return { samples: [], anchor: `healthkit:${signal}:empty` };
    }
    const result = await this.client.queryQuantity(STEPS_TYPE, "count", {
      anchor: sinceAnchor,
    });
    this.latestAnchors.set(signal, result.anchor);
    return result;
  }

  public async getTodayTotal(signal: HealthSignal): Promise<number> {
    const now = this.now();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const query = {
      anchor: null,
      from,
      to: now,
    } as const;
    if (signal === "appleExerciseTime") {
      const exerciseTime = await this.client.queryQuantity(
        EXERCISE_TIME_TYPE,
        "min",
        query,
      );
      const recordedExerciseTime = exerciseTime.samples.filter(
        (sample) => !sample.wasUserEntered,
      );
      if (recordedExerciseTime.length > 0) {
        return sum(recordedExerciseTime);
      }
      return sum((await this.client.queryWorkouts(query)).samples);
    }
    if (signal === "steps") {
      return sum(
        (await this.client.queryQuantity(STEPS_TYPE, "count", query)).samples,
      );
    }
    return 0;
  }

  public onChange(
    signal: HealthSignal,
    callback: (change: HealthChange) => void,
  ): HealthUnsubscribe {
    const callbacks =
      this.changeCallbacks.get(signal) ??
      new Set<(change: HealthChange) => void>();
    callbacks.add(callback);
    this.changeCallbacks.set(signal, callbacks);
    this.reconcileSubscriptions();
    return () => {
      callbacks.delete(callback);
      this.reconcileSubscriptions();
    };
  }

  public onAuthorizationChange(
    callback: (status: HealthAuthorizationStatus) => void,
  ): HealthUnsubscribe {
    this.authorizationCallbacks.add(callback);
    return () => this.authorizationCallbacks.delete(callback);
  }

  public dispose(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
    this.authorizationCallbacks.clear();
    this.changeCallbacks.clear();
  }

  private reconcileSubscriptions(): void {
    const needsSteps =
      this.authorizationStatus === "authorized" &&
      (this.changeCallbacks.get("steps")?.size ?? 0) > 0;
    if (needsSteps && !this.subscriptions.has(STEPS_TYPE)) {
      this.subscriptions.set(
        STEPS_TYPE,
        this.client.subscribe(STEPS_TYPE, () => this.handleStepChange()),
      );
    } else if (!needsSteps) {
      this.subscriptions.get(STEPS_TYPE)?.();
      this.subscriptions.delete(STEPS_TYPE);
    }
  }

  private handleStepChange(): void {
    this.emitChange({
      signal: "steps",
      reason: "backgroundWake",
      samples: [],
    });
    void this.getNewSamples(
      "steps",
      this.latestAnchors.get("steps") ?? null,
    ).then((result) => {
      if (result.samples.length > 0) {
        this.emitChange({
          signal: "steps",
          reason: "samplesAdded",
          samples: result.samples,
        });
      }
    });
  }

  private emitChange(change: HealthChange): void {
    this.changeCallbacks
      .get(change.signal)
      ?.forEach((callback) => callback(change));
  }

  private setAuthorizationStatus(status: HealthAuthorizationStatus): void {
    if (this.authorizationStatus === status) {
      return;
    }
    this.authorizationStatus = status;
    this.authorizationCallbacks.forEach((callback) => callback(status));
  }
}

function sum(samples: Awaited<ReturnType<HealthKitClient["queryWorkouts"]>>["samples"]): number {
  return samples.reduce(
    (total, sample) =>
      sample.wasUserEntered ? total : total + sample.value,
    0,
  );
}

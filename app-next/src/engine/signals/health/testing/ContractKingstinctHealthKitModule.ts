import type {
  KingstinctHealthKitModule,
  KingstinctQuantitySample,
  KingstinctWorkoutSample,
} from "../KingstinctHealthKitClient";

const initialSteps: readonly KingstinctQuantitySample[] = [
  quantitySample(100, "2026-07-29T12:00:00.000Z", false),
  quantitySample(900, "2026-07-29T12:05:00.000Z", true),
];

const futureStep = quantitySample(
  50,
  "2026-07-29T12:06:00.000Z",
  false,
);

export class ContractKingstinctHealthKitModule
  implements KingstinctHealthKitModule
{
  private readonly callbacks = new Map<
    string,
    Set<Parameters<KingstinctHealthKitModule["subscribeToChanges"]>[1]>
  >();
  private steps: readonly KingstinctQuantitySample[] = initialSteps;

  public isHealthDataAvailable(): boolean {
    return true;
  }

  public async requestAuthorization(): Promise<boolean> {
    return true;
  }

  public async configureBackgroundTypes(): Promise<boolean> {
    return true;
  }

  public async queryQuantitySamplesWithAnchor(
    identifier: string,
    options: Parameters<
      KingstinctHealthKitModule["queryQuantitySamplesWithAnchor"]
    >[1],
  ): Promise<{
    readonly samples: readonly KingstinctQuantitySample[];
    readonly newAnchor: string;
  }> {
    if (identifier !== "HKQuantityTypeIdentifierStepCount") {
      return { samples: [], newAnchor: `${identifier}:0` };
    }
    const prefix = "steps:";
    const sequence = options.anchor?.startsWith(prefix)
      ? Number(options.anchor.slice(prefix.length))
      : 0;
    return {
      samples: this.steps.slice(sequence),
      newAnchor: `${prefix}${this.steps.length}`,
    };
  }

  public async queryWorkoutSamplesWithAnchor(): Promise<{
    readonly workouts: readonly KingstinctWorkoutSample[];
    readonly newAnchor: string;
  }> {
    return { workouts: [], newAnchor: "workout:0" };
  }

  public subscribeToChanges(
    identifier: string,
    callback: Parameters<KingstinctHealthKitModule["subscribeToChanges"]>[1],
  ): { remove(): void } {
    const callbacks =
      this.callbacks.get(identifier) ??
      new Set<Parameters<KingstinctHealthKitModule["subscribeToChanges"]>[1]>();
    callbacks.add(callback);
    this.callbacks.set(identifier, callbacks);
    return { remove: () => callbacks.delete(callback) };
  }

  public async advanceTo(atMs: number): Promise<void> {
    if (atMs < 2_000 || this.steps.length > initialSteps.length) {
      return;
    }
    this.steps = [...initialSteps, futureStep];
    this.callbacks
      .get("HKQuantityTypeIdentifierStepCount")
      ?.forEach((callback) => callback({}));
    for (let turn = 0; turn < 4; turn += 1) {
      await Promise.resolve();
    }
  }
}

function quantitySample(
  quantity: number,
  startISO: string,
  wasUserEntered: boolean,
): KingstinctQuantitySample {
  return {
    quantity,
    startDate: new Date(startISO),
    endDate: new Date(startISO),
    metadata: { HKWasUserEntered: wasUserEntered },
    sourceRevision: {
      source: {
        name: "Apple Health",
        bundleIdentifier: "com.apple.health",
      },
      operatingSystemVersion: "26.0.0",
    },
  };
}

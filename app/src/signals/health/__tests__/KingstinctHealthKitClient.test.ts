import { NativeHealthProvider } from "../NativeHealthProvider";
import {
  KingstinctHealthKitClient,
  type KingstinctHealthKitModule,
  type KingstinctQuantitySample,
  type KingstinctWorkoutSample,
} from "../KingstinctHealthKitClient";

const NOW = new Date("2026-07-29T12:00:00-04:00");

describe("Kingstinct HealthKit client", () => {
  it("converts native samples and configures every on-device read", async () => {
    const native = new FakeKingstinctModule();
    const provider = new NativeHealthProvider(
      new KingstinctHealthKitClient(native),
      () => NOW,
    );

    expect(await provider.requestAuth()).toBe("authorized");
    expect((await provider.getNewSamples("steps", null)).samples).toEqual([
      {
        value: 100,
        startISO: "2026-07-29T12:00:00.000Z",
        endISO: "2026-07-29T12:05:00.000Z",
        sourceRevision: {
          name: "Apple Watch",
          bundleIdentifier: "com.apple.health",
          operatingSystemVersion: "26.0.0",
          productType: "Watch7,1",
          version: "26.0",
        },
        wasUserEntered: false,
      },
      expect.objectContaining({ value: 900, wasUserEntered: true }),
    ]);
    expect(await provider.getTodayTotal("steps")).toBe(100);
    expect(await provider.getTodayTotal("workout")).toBe(35);
    expect(native.didConfigureEveryReadType).toBe(true);

    provider.dispose();
  });
});

class FakeKingstinctModule implements KingstinctHealthKitModule {
  public didConfigureEveryReadType = false;

  public isHealthDataAvailable(): boolean {
    return true;
  }

  public async requestAuthorization(options: {
    readonly toRead: readonly string[];
  }): Promise<boolean> {
    return options.toRead.length === 7;
  }

  public async configureBackgroundTypes(
    typeIdentifiers: readonly string[],
    updateFrequency: number,
  ): Promise<boolean> {
    this.didConfigureEveryReadType =
      typeIdentifiers.length === 7 && updateFrequency === 1;
    return this.didConfigureEveryReadType;
  }

  public async queryQuantitySamplesWithAnchor(): Promise<{
    readonly samples: readonly KingstinctQuantitySample[];
    readonly newAnchor: string;
  }> {
    return {
      samples: [nativeQuantitySample(100, false), nativeQuantitySample(900, true)],
      newAnchor: "native-steps-anchor",
    };
  }

  public async queryWorkoutSamplesWithAnchor(): Promise<{
    readonly workouts: readonly KingstinctWorkoutSample[];
    readonly newAnchor: string;
  }> {
    return {
      workouts: [nativeWorkoutSample(2_100, false), nativeWorkoutSample(6_000, true)],
      newAnchor: "native-workouts-anchor",
    };
  }

  public subscribeToChanges(): { remove(): void } {
    return { remove: () => undefined };
  }
}

function nativeQuantitySample(
  quantity: number,
  wasUserEntered: boolean,
): KingstinctQuantitySample {
  return {
    quantity,
    startDate: new Date("2026-07-29T12:00:00.000Z"),
    endDate: new Date("2026-07-29T12:05:00.000Z"),
    metadata: { HKWasUserEntered: wasUserEntered },
    sourceRevision: nativeSourceRevision,
  };
}

function nativeWorkoutSample(
  seconds: number,
  wasUserEntered: boolean,
): KingstinctWorkoutSample {
  return {
    duration: { quantity: seconds },
    startDate: new Date("2026-07-29T12:00:00.000Z"),
    endDate: new Date("2026-07-29T12:35:00.000Z"),
    metadata: { HKWasUserEntered: wasUserEntered },
    sourceRevision: nativeSourceRevision,
  };
}

const nativeSourceRevision = {
  source: {
    name: "Apple Watch",
    bundleIdentifier: "com.apple.health",
  },
  operatingSystemVersion: "26.0.0",
  productType: "Watch7,1",
  version: "26.0",
} as const;

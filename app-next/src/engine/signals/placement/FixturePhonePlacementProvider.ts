import type {
  DeviceMotionSample,
  PhonePlacementProvider,
  PhonePlacementSubscription,
} from "./PhonePlacementProvider";

export class FixturePhonePlacementProvider implements PhonePlacementProvider {
  private readonly callbacks = new Set<(sample: DeviceMotionSample) => void>();
  private readonly samples: readonly DeviceMotionSample[];
  private currentTimeMs = 0;
  private nextSampleIndex = 0;
  private started = false;

  public constructor(samples: readonly DeviceMotionSample[]) {
    this.samples = [...samples].sort(
      (left, right) => left.timestampMs - right.timestampMs,
    );
  }

  public async start(): Promise<void> {
    this.started = true;
  }

  public async stop(): Promise<void> {
    this.started = false;
  }

  public onSample(
    callback: (sample: DeviceMotionSample) => void,
  ): PhonePlacementSubscription {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public advanceTo(timestampMs: number): void {
    if (!this.started) {
      return;
    }
    if (timestampMs < this.currentTimeMs) {
      throw new Error("Placement fixture time cannot move backwards");
    }
    this.currentTimeMs = timestampMs;
    while (
      this.nextSampleIndex < this.samples.length &&
      this.samples[this.nextSampleIndex].timestampMs <= timestampMs
    ) {
      const sample = this.samples[this.nextSampleIndex];
      this.nextSampleIndex += 1;
      this.callbacks.forEach((callback) => callback(sample));
    }
  }
}

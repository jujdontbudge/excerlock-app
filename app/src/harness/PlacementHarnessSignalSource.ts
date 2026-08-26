import {
  PhonePlacementClassifier,
  type PhonePlacementProvider,
  type PhonePlacementSubscription,
} from "@/signals/placement";
import type {
  HarnessSignalRecorder,
  HarnessSignalSource,
} from "./HarnessRunEngine";

export class PlacementHarnessSignalSource implements HarnessSignalSource {
  public readonly id = "placement" as const;

  private unsubscribe: PhonePlacementSubscription | undefined;

  public constructor(private readonly provider: PhonePlacementProvider) {}

  public async start(recorder: HarnessSignalRecorder): Promise<void> {
    if (this.unsubscribe !== undefined) {
      throw new Error("Placement harness source is already running");
    }

    const classifier = new PhonePlacementClassifier();
    this.unsubscribe = this.provider.onSample((sample) => {
      recorder.record("raw-device-motion", {
        timestampMs: sample.timestampMs,
        gravity: sample.gravity,
        rotationRate: sample.rotationRate,
      });
      const result = classifier.process(sample);
      recorder.record("placement-classification", {
        placement: result.placement,
        transition: result.transition,
        evaluatedAtMs: result.evaluatedAtMs,
      });
    });

    try {
      await this.provider.start();
    } catch (error) {
      this.unsubscribe();
      this.unsubscribe = undefined;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    await this.provider.stop();
  }
}

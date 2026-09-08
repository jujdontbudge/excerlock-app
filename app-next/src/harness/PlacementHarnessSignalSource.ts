import {
  PhonePlacementClassifier,
  type PhonePlacementProvider,
  type PhonePlacementSubscription,
} from "../engine/signals/placement";
import type {
  HarnessSignalRecorder,
  HarnessSignalSource,
} from "./HarnessRunEngine";

export class PlacementHarnessSignalSource implements HarnessSignalSource {
  public readonly id = "placement" as const;

  private provider: PhonePlacementProvider | undefined;
  private unsubscribe: PhonePlacementSubscription | undefined;

  public constructor(
    private readonly providerOrFactory:
      | PhonePlacementProvider
      | (() => PhonePlacementProvider),
  ) {}

  public async start(recorder: HarnessSignalRecorder): Promise<void> {
    if (this.unsubscribe !== undefined) {
      throw new Error("Placement harness source is already running");
    }

    const provider = typeof this.providerOrFactory === "function"
      ? this.providerOrFactory()
      : this.providerOrFactory;
    this.provider = provider;
    const classifier = new PhonePlacementClassifier();
    this.unsubscribe = provider.onSample((sample) => {
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
      await provider.start();
    } catch (error) {
      this.unsubscribe();
      this.unsubscribe = undefined;
      this.provider = undefined;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    const provider = this.provider;
    this.provider = undefined;
    await provider?.stop();
  }
}

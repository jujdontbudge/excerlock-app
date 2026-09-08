import {
  GaitPeriodicityDetector,
  type GaitVisionProvider,
} from "../engine/signals/gait";
import type {
  HarnessSignalPreparationContext,
  HarnessSignalRecorder,
  HarnessSignalSource,
} from "./HarnessRunEngine";

export interface HarnessFootageCapture {
  begin(captureId: string): Promise<string | undefined>;
  end(): Promise<void>;
  deleteAll(): Promise<void>;
}

/**
 * Observe-only adapter around the production gait provider and detector.
 * Capture is deliberately separate so product gait scans retain their
 * no-frames-on-disk behavior.
 */
export class HarnessCameraSource implements HarnessSignalSource {
  public readonly id = "camera" as const;
  private removeSample: (() => void) | undefined;

  public constructor(
    private readonly dependencies: Readonly<{
      capture: HarnessFootageCapture;
      provider: GaitVisionProvider;
    }>,
  ) {}

  public async prepare(context: HarnessSignalPreparationContext): Promise<void> {
    const fileUri = await this.dependencies.capture.begin(context.captureId);
    try {
      await this.dependencies.provider.start();
      if (fileUri !== undefined) {
        context.attachFootage(fileUri);
      }
    } catch (error) {
      await this.dependencies.capture.end().catch(() => undefined);
      throw error;
    }
  }

  public async start(recorder: HarnessSignalRecorder): Promise<void> {
    let detector: GaitPeriodicityDetector | undefined;
    this.removeSample = this.dependencies.provider.onSample((sample) => {
      detector ??= new GaitPeriodicityDetector({
        startedAtMs: sample.timestampMs,
      });
      recorder.record("landmarks", {
        timestampMs: sample.timestampMs,
        landmarks: sample.landmarks,
        ...(sample.head === undefined ? {} : { head: sample.head }),
      });
      recorder.record("detector", { ...detector.process(sample) });
    });
  }

  public async stop(): Promise<void> {
    this.removeSample?.();
    this.removeSample = undefined;
    await this.dependencies.provider.stop().catch(() => undefined);
    await this.dependencies.capture.end();
  }
}

import {
  WalkVerifier,
  type MotionProvider,
  type Unsubscribe,
} from "@/signals";
import type {
  HarnessSignalRecorder,
  HarnessSignalSource,
} from "../HarnessRunEngine";

const OBSERVE_ONLY_GRACE_MS = 30_000;

/** Records the production motion interface and verifier without product effects. */
export class MotionHarnessSource implements HarnessSignalSource {
  public readonly id = "motion" as const;
  private provider: MotionProvider | undefined;
  private unsubscribes: Unsubscribe[] = [];

  public constructor(private readonly createProvider: () => MotionProvider) {}

  public async start(recorder: HarnessSignalRecorder): Promise<void> {
    const provider = this.createProvider();
    const verifier = new WalkVerifier({ gracePeriodMs: OBSERVE_ONLY_GRACE_MS });
    this.provider = provider;
    this.unsubscribes = [
      provider.on("activity", (sample) => {
        recorder.record("raw.activity", { ...sample });
        recorder.record("derived.verdict", {
          ...verifier.processActivity(sample),
        });
      }),
      provider.on("cadence", (sample) => {
        recorder.record("raw.cadence", { ...sample });
        recorder.record("derived.verdict", {
          ...verifier.processCadence(sample),
        });
      }),
    ];
    try {
      await provider.start();
    } catch (error) {
      this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
      this.provider = undefined;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
    const provider = this.provider;
    this.provider = undefined;
    await provider?.stop();
  }
}

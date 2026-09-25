import type { GaitKeypointSample, GaitSampleSubscription, GaitVisionProvider } from '../../../ports/GaitVisionProvider';

export class FixtureGaitVisionProvider implements GaitVisionProvider {
  private readonly callbacks = new Set<(sample: GaitKeypointSample) => void>();
  private readonly samples: readonly GaitKeypointSample[];
  private currentTimeMs = 0;
  private nextSampleIndex = 0;
  private started = false;

  public constructor(samples: readonly GaitKeypointSample[]) {
    this.samples = [...samples].sort((left, right) => left.timestampMs - right.timestampMs);
  }

  public async start(): Promise<void> {
    this.started = true;
  }

  public async stop(): Promise<void> {
    this.started = false;
  }

  public onSample(callback: (sample: GaitKeypointSample) => void): GaitSampleSubscription {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public advanceTo(timestampMs: number): void {
    if (!this.started) {
      return;
    }
    if (timestampMs < this.currentTimeMs) {
      throw new Error('Gait fixture time cannot move backwards');
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

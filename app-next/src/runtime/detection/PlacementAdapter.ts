import {
  PhonePlacementClassifier,
  type PhonePlacementResult,
} from '../../engine/signals/placement/PhonePlacementClassifier';
import type {
  PhonePlacementProvider,
  PhonePlacementSubscription,
} from '../../engine/signals/placement/PhonePlacementProvider';

export const PLACEMENT_FRESHNESS_MS = 5_000;
export type PlacementEvidence = { placement: 'propped' | 'handheld' | 'unknown'; at: number | null };

/** Keeps the device-verified classifier thresholds; this boundary only maps vocabulary and freshness. */
export class PlacementAdapter {
  private classifier = new PhonePlacementClassifier();
  private unsubscribe: PhonePlacementSubscription | null = null;
  private listeners = new Set<(result: PhonePlacementResult) => void>();

  constructor(private readonly provider: PhonePlacementProvider) {}

  async start(): Promise<void> {
    if (this.unsubscribe) return;
    this.unsubscribe = this.provider.onSample((sample) => {
      const result = this.classifier.process(sample);
      this.listeners.forEach((listener) => listener(result));
    });
    await this.provider.start();
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    await this.provider.stop();
  }

  subscribe(callback: (result: PhonePlacementResult) => void): PhonePlacementSubscription {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  reconcile(now: number): PlacementEvidence {
    const result = this.classifier.getResult();
    if (result.evaluatedAtMs === null || now - result.evaluatedAtMs > PLACEMENT_FRESHNESS_MS) {
      return { placement: 'unknown', at: result.evaluatedAtMs };
    }
    return {
      placement: result.placement === 'inHand' ? 'handheld' : result.placement,
      at: result.evaluatedAtMs,
    };
  }
}

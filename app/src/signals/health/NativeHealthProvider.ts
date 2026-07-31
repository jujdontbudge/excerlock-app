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
import {
  HEALTHKIT_TYPES,
  HEALTHKIT_WORKOUT_TYPE,
  quantityDefinition,
  signalsChangedBy,
} from "./healthKitSignalMapping";
import { getHealthKitTodayTotal } from "./healthKitTotals";

export class NativeHealthProvider implements HealthProvider {
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
      await this.client
        .configureBackgroundDelivery(HEALTHKIT_TYPES)
        .catch(() => undefined);
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
    const definition = quantityDefinition(signal);
    const result =
      definition === undefined
        ? await this.client.queryWorkouts({ anchor: sinceAnchor })
        : await this.client.queryQuantity(
            definition.type,
            definition.unit,
            { anchor: sinceAnchor },
          );
    this.latestAnchors.set(signal, result.anchor);
    return result;
  }

  public getTodayTotal(signal: HealthSignal): Promise<number> {
    return getHealthKitTodayTotal(this.client, signal, this.now());
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
    const desired = new Set<HealthKitObjectType>();
    if (this.authorizationStatus === "authorized") {
      HEALTHKIT_TYPES.forEach((type) => {
        if (
          signalsChangedBy(type).some(
            (signal) => (this.changeCallbacks.get(signal)?.size ?? 0) > 0,
          )
        ) {
          desired.add(type);
        }
      });
    }
    desired.forEach((type) => {
      if (!this.subscriptions.has(type)) {
        this.subscriptions.set(
          type,
          this.client.subscribe(type, () => this.handleChange(type)),
        );
      }
    });
    this.subscriptions.forEach((unsubscribe, type) => {
      if (!desired.has(type)) {
        unsubscribe();
        this.subscriptions.delete(type);
      }
    });
  }

  private handleChange(type: HealthKitObjectType): void {
    const changedSignals = signalsChangedBy(type);
    changedSignals.forEach((signal) => {
      this.emitChange({ signal, reason: "backgroundWake", samples: [] });
    });
    const sampleSignal =
      type === HEALTHKIT_WORKOUT_TYPE ? "workout" : changedSignals[0];
    if (sampleSignal !== undefined) {
      void this.emitNewSamples(sampleSignal);
    }
  }

  private async emitNewSamples(signal: HealthSignal): Promise<void> {
    await this.getNewSamples(
      signal,
      this.latestAnchors.get(signal) ?? null,
    ).then((result) => {
      if (result.samples.length > 0) {
        this.emitChange({
          signal,
          reason: "samplesAdded",
          samples: result.samples,
        });
      }
    }).catch(() => undefined);
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

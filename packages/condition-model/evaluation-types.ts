import type {
  ConditionSource,
  Signal,
} from "./catalog-types";
import type { CatalogId } from "./catalog";

export type EventReward =
  | { readonly type: "fixedMinutes"; readonly minutes: number }
  | { readonly type: "restOfDay" }
  | { readonly type: "setPeriod"; readonly durationMinutes: number };

export interface EventSettings {
  readonly kind: "event";
  readonly threshold?: number;
  readonly reward: EventReward;
  readonly repeatable: boolean;
  readonly perDayCap: number | null;
  readonly cooldownMs: number;
}

export interface EventCondition {
  readonly id: string;
  readonly catalogId: CatalogId;
  readonly source: ConditionSource;
  readonly placeId?: string;
  readonly settings: EventSettings;
}

interface SignalPayload {
  readonly signal: Signal;
  readonly source: ConditionSource;
  readonly placeId?: string;
}

export interface SignalSnapshotPayload extends SignalPayload {
  readonly sampleId: string;
  readonly value: number;
}

export interface SignalDeltaPayload extends SignalPayload {
  readonly sampleId: string;
  readonly delta: number;
}

export interface SignalOccurrencePayload extends SignalPayload {
  readonly occurrenceId: string;
  readonly value?: number;
}

export interface SignalStatePayload extends SignalPayload {
  readonly sampleId: string;
  readonly active: boolean;
}

export type SignalTimelineRow =
  | {
      readonly atMs: number;
      readonly event: "signalSnapshot";
      readonly payload: SignalSnapshotPayload;
    }
  | {
      readonly atMs: number;
      readonly event: "signalDelta";
      readonly payload: SignalDeltaPayload;
    }
  | {
      readonly atMs: number;
      readonly event: "signalOccurrence";
      readonly payload: SignalOccurrencePayload;
    }
  | {
      readonly atMs: number;
      readonly event: "signalState";
      readonly payload: SignalStatePayload;
    };

export interface EvaluationClock {
  readonly dayStartMs: number;
  readonly nowMs: number;
}

export interface EventFiredOutcome {
  readonly type: "eventFired";
  readonly atMs: number;
  readonly conditionId: string;
  readonly sourceEventId: string;
  readonly reward: EventReward;
}

export type EvaluationOutcome = EventFiredOutcome;

import type { Signal } from "@excerlock/condition-model";
import type { Journal } from "@excerlock/ledger";

import type { JsonValue, SignalDomain, Vendor } from "@/signals";

export type ScenarioPlayback =
  | Readonly<{ playback: "manual" }>
  | Readonly<{ playback: "auto"; speed: number }>;

export type ScenarioClock = Readonly<{ now: string }> & ScenarioPlayback;

export type ScenarioConditionSource =
  | "health"
  | "motion"
  | "location"
  | Vendor;

type ScenarioConditionBase = Readonly<{
  signal: Signal;
  source: ScenarioConditionSource;
  placeId?: string;
}>;

export type ScenarioCondition =
  | (ScenarioConditionBase &
      Readonly<{
        kind: "event";
        threshold?: number;
        reward:
          | Readonly<{ type: "fixedChunk"; minutes: number }>
          | Readonly<{ type: "restOfDay" }>
          | Readonly<{ type: "setPeriod"; minutes: number }>;
      }>)
  | (ScenarioConditionBase &
      Readonly<{
        kind: "rate";
        reward: Readonly<{
          type: "proportionalCredit";
          minutesPerUnit: number;
        }>;
      }>)
  | (ScenarioConditionBase &
      Readonly<{
        kind: "state";
        exitGraceMs: number;
        reward: Readonly<{ type: "sustainedUnlock" }>;
      }>);

export type ScenarioVendorState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type ScenarioTimelineRow = Readonly<{
  atMs: number;
  event: string;
  payload: JsonValue;
}>;

export type ScenarioManifest = Readonly<{
  name: string;
  version: number;
  description: string;
  clock: ScenarioClock;
  state: Readonly<{
    onboarding: "complete" | "fresh";
    entitlement: "free" | "premium";
    ledger: Readonly<{
      baseAllowanceMinutes: number;
      journal: Journal["entries"];
    }>;
    conditions: readonly ScenarioCondition[];
    shield: Readonly<{ armedMonitors: readonly string[] }>;
    vendors: Readonly<Record<Vendor, ScenarioVendorState>>;
  }>;
  providers: Readonly<
    Record<SignalDomain, Readonly<{ fixture: string }>>
  >;
  timeline?: readonly ScenarioTimelineRow[];
}>;

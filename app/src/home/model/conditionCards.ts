import {
  getCatalogEntry,
  type CatalogEntry,
  type ConditionSource,
  type ConfiguredCondition,
  type EventReward,
  type PickerUnit,
} from "@excerlock/condition-model";

import { formatCount, formatMinutes, formatQuantity } from "./duration";
import type { SignalReading } from "./reading";
import {
  bannerForCondition,
  type BannerSelection,
} from "../banners/bannerCatalog";

/**
 * One card per active condition (PRD §3.15 Tab 1), in the variant its kind
 * demands. The model is complete on its own — a card component renders these
 * strings and never reaches for the catalog, the ledger or a signal.
 */

/** Display copy. The picker keeps its own copy for the reasons it writes. */
const SOURCE_LABELS: Readonly<Record<ConditionSource, string>> = {
  location: "Location",
  motion: "Motion",
  appleHealth: "Apple Health",
  strava: "Strava",
  oura: "Oura",
  whoop: "Whoop",
  polar: "Polar",
  hevy: "Hevy",
  concept2: "Concept2",
};

interface CardBase {
  readonly id: string;
  readonly title: string;
  /** Where the signal comes from — or the saved gym, when the condition has one. */
  readonly sourceLabel: string;
  readonly banner: BannerSelection;
}

export interface EventCardModel extends CardBase {
  readonly kind: "event";
  /** Absent on thresholdless events (arriving at a gym has no meter). */
  readonly goalLabel?: string;
  readonly progressLabel?: string;
  /** 0–1, clamped. Always 0 when the event has no threshold. */
  readonly progress: number;
  readonly rewardLabel: string;
  readonly completed: boolean;
}

export interface StateCardModel extends CardBase {
  readonly kind: "state";
  readonly active: boolean;
  readonly statusLabel: string;
  readonly graceLabel: string;
  readonly startsWalkingSession: boolean;
}

export interface RateCardModel extends CardBase {
  readonly kind: "rate";
  readonly ratioLabel: string;
  readonly meterLabel: string;
  readonly bankedMinutes: number;
}

export type ConditionCardModel = EventCardModel | StateCardModel | RateCardModel;

export interface ConditionCardsInput {
  readonly conditions: readonly ConfiguredCondition[];
  readonly reading: SignalReading;
  /** Conditions the ledger already paid out today — an event card stays completed. */
  readonly firedConditionIds?: readonly string[];
  readonly placeNames?: Readonly<Record<string, string>>;
  readonly conditionBanners?: Readonly<Record<string, BannerSelection>>;
}

export function toConditionCards({
  conditions,
  reading,
  firedConditionIds = [],
  placeNames = {},
  conditionBanners = {},
}: ConditionCardsInput): readonly ConditionCardModel[] {
  return conditions.map((condition) => {
    const entry = getCatalogEntry(condition.catalogId);
    const base: CardBase = {
      id: condition.id,
      title: entry.name,
      sourceLabel: sourceLabelFor(condition, entry, placeNames),
      banner: bannerForCondition(condition, conditionBanners[condition.id]),
    };

    switch (condition.settings.kind) {
      case "event":
        return eventCard(base, entry, condition.settings, reading, firedConditionIds.includes(condition.id));
      case "state":
        return stateCard(base, entry, condition.settings.exitGraceMs, reading);
      case "rate":
        return rateCard(base, entry, condition.settings.reward.minutesPerUnit, reading);
    }
  });
}

function sourceLabelFor(
  condition: ConfiguredCondition,
  entry: CatalogEntry,
  placeNames: Readonly<Record<string, string>>,
): string {
  if (entry.placeRequired && condition.placeId !== undefined) {
    return placeNames[condition.placeId] ?? "Saved gym";
  }
  return SOURCE_LABELS[condition.source];
}

function eventCard(
  base: CardBase,
  entry: CatalogEntry,
  settings: Extract<ConfiguredCondition["settings"], { kind: "event" }>,
  reading: SignalReading,
  firedToday: boolean,
): EventCardModel {
  const rewardLabel = rewardLabelFor(settings.reward);
  const unit = thresholdUnit(entry);

  if (settings.threshold === undefined || unit === undefined) {
    return { ...base, kind: "event", progress: 0, rewardLabel, completed: firedToday };
  }

  const total = reading.totals[entry.signal] ?? 0;
  return {
    ...base,
    kind: "event",
    goalLabel: formatQuantity(settings.threshold, unit),
    progressLabel: `${formatCount(total)} of ${formatQuantity(settings.threshold, unit)}`,
    progress: Math.min(1, total / settings.threshold),
    rewardLabel,
    completed: firedToday || total >= settings.threshold,
  };
}

function stateCard(
  base: CardBase,
  entry: CatalogEntry,
  exitGraceMs: number,
  reading: SignalReading,
): StateCardModel {
  const active = reading.activeSignals.includes(entry.signal);
  return {
    ...base,
    kind: "state",
    active,
    // Usage during a state still drains (PRD §3.3, decided 2026-07-29) — the
    // state only holds the shields open, so the card never claims a paused drain.
    statusLabel: active ? "Active · apps unlocked" : "Waiting to start",
    graceLabel: `${formatGrace(exitGraceMs)} grace`,
    startsWalkingSession: entry.signal === "walking",
  };
}

function rateCard(
  base: CardBase,
  entry: CatalogEntry,
  minutesPerUnit: number,
  reading: SignalReading,
): RateCardModel {
  const total = reading.totals[entry.signal] ?? 0;
  const banked = total * minutesPerUnit;
  const quantum = entry.picker.type === "rate" ? entry.picker.quantum : undefined;

  return {
    ...base,
    kind: "rate",
    ratioLabel:
      quantum === undefined
        ? `${formatQuantity(minutesPerUnit, "minute")} per unit`
        : `${formatQuantity(quantum.value, quantum.unit)} = ${formatQuantity(
            quantum.value * minutesPerUnit,
            "minute",
          )}`,
    meterLabel:
      quantum === undefined
        ? `${formatMinutes(banked)} banked today`
        : `${formatQuantity(total, quantum.unit)} → ${formatMinutes(banked)} banked today`,
    bankedMinutes: banked,
  };
}

function thresholdUnit(entry: CatalogEntry): PickerUnit | undefined {
  return entry.picker.type === "threshold" ? entry.picker.range.unit : undefined;
}

function rewardLabelFor(reward: EventReward): string {
  switch (reward.type) {
    case "fixedMinutes":
      return `+${reward.minutes} min`;
    case "restOfDay":
      return "Rest of day";
    case "setPeriod":
      return `${reward.durationMinutes} min unlocked`;
  }
}

function formatGrace(exitGraceMs: number): string {
  const seconds = Math.round(exitGraceMs / 1_000);
  return seconds < 60 ? `${seconds}s` : formatQuantity(Math.round(seconds / 60), "minute");
}

import { CONDITION_CATALOG, type CatalogId } from "./catalog";
import type {
  CatalogEntry,
  ConditionSource,
  ConnectedExtraSource,
  TierOneVendorSource,
} from "./catalog-types";
import {
  VENDOR_COVERAGE,
  VENDOR_SIGNALS,
  type VendorCoverageCell,
  type VendorCoverageStatus,
  type VendorSignal,
} from "./coverage";

const TIER_ONE_VENDORS = [
  "strava",
  "oura",
  "whoop",
  "polar",
] as const satisfies readonly TierOneVendorSource[];

const CONNECTED_EXTRA_SOURCES = [
  "hevy",
  "concept2",
] as const satisfies readonly ConnectedExtraSource[];

const SOURCE_NAMES: Readonly<Record<ConditionSource, string>> = {
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

export interface ConditionSelection {
  readonly catalogId: CatalogId;
  readonly source: ConditionSource;
  readonly placeId?: string;
}

export interface ExistingCondition extends ConditionSelection {
  readonly id: string;
}

export type ConditionOverlap = "duplicate" | "eventRate" | "none";
export type PickerStatus = "available" | "taken" | "blocked" | "hidden";
export type PickerCoverage = VendorCoverageStatus;

export type PickerReasonCode =
  | "duplicate"
  | "event-rate-overlap"
  | "source-incompatible"
  | "source-not-connected"
  | "place-required"
  | "place-not-saved"
  | "place-not-applicable";

export interface PickerReason {
  readonly code: PickerReasonCode;
  readonly message: string;
}

export interface PickerContext {
  readonly conditions: readonly ExistingCondition[];
  readonly connectedSources: readonly (
    | TierOneVendorSource
    | ConnectedExtraSource
  )[];
  readonly savedPlaceIds: readonly string[];
}

export interface PickerVerdict extends ConditionSelection {
  readonly name: string;
  readonly coverage: PickerCoverage;
  readonly isRecommended: boolean;
  readonly status: PickerStatus;
  readonly reason?: PickerReason;
}

export function getCatalogEntry(catalogId: CatalogId): CatalogEntry {
  const entry = CONDITION_CATALOG.find(({ id }) => id === catalogId);
  if (entry === undefined) {
    throw new Error(`Unknown condition catalog entry: ${catalogId}`);
  }
  return entry;
}

export function conditionUniquenessKey(
  condition: ConditionSelection,
): readonly [
  CatalogEntry["kind"],
  CatalogEntry["signal"],
  ConditionSource,
  string | null,
] {
  const entry = getCatalogEntry(condition.catalogId);
  return [
    entry.kind,
    entry.signal,
    condition.source,
    condition.placeId ?? null,
  ];
}

export function conditionsOverlap(
  left: ConditionSelection,
  right: ConditionSelection,
): ConditionOverlap {
  const leftEntry = getCatalogEntry(left.catalogId);
  const rightEntry = getCatalogEntry(right.catalogId);
  const leftKey = conditionUniquenessKey(left);
  const rightKey = conditionUniquenessKey(right);

  if (leftKey.every((part, index) => part === rightKey[index])) {
    return "duplicate";
  }

  const kinds = new Set([leftEntry.kind, rightEntry.kind]);
  if (
    kinds.has("event") &&
    kinds.has("rate") &&
    leftEntry.signal === rightEntry.signal &&
    left.source === right.source
  ) {
    return "eventRate";
  }

  return "none";
}

function isTierOneVendor(
  source: ConditionSource,
): source is TierOneVendorSource {
  return TIER_ONE_VENDORS.includes(source as TierOneVendorSource);
}

function isConnectedSource(
  source: ConditionSource,
): source is TierOneVendorSource | ConnectedExtraSource {
  return (
    isTierOneVendor(source) ||
    CONNECTED_EXTRA_SOURCES.includes(source as ConnectedExtraSource)
  );
}

function isVendorSignal(signal: CatalogEntry["signal"]): signal is VendorSignal {
  return VENDOR_SIGNALS.includes(signal as VendorSignal);
}

function incompatible(reason: string): VendorCoverageCell {
  return { status: "impossible", reason };
}

function coverageFor(
  entry: CatalogEntry,
  source: ConditionSource,
): VendorCoverageCell {
  if (isTierOneVendor(source)) {
    if (!isVendorSignal(entry.signal)) {
      return incompatible(`${SOURCE_NAMES[source]} cannot provide this signal.`);
    }
    return VENDOR_COVERAGE[source][entry.signal];
  }

  if (entry.baseSources.includes(source)) {
    return { status: "promoted" };
  }

  return incompatible(`${SOURCE_NAMES[source]} cannot provide this signal.`);
}

function withReason(
  selection: ConditionSelection,
  entry: CatalogEntry,
  coverage: PickerCoverage,
  status: PickerStatus,
  reason: PickerReason,
): PickerVerdict {
  return {
    ...selection,
    name: entry.name,
    coverage,
    isRecommended: coverage === "promoted",
    status,
    reason,
  };
}

export function getPickerVerdict(
  selection: ConditionSelection,
  context: PickerContext,
): PickerVerdict {
  const entry = getCatalogEntry(selection.catalogId);
  const sourceCoverage = coverageFor(entry, selection.source);

  if (sourceCoverage.status === "impossible") {
    return withReason(selection, entry, "impossible", "hidden", {
      code: "source-incompatible",
      message: sourceCoverage.reason,
    });
  }

  if (
    isConnectedSource(selection.source) &&
    !context.connectedSources.includes(selection.source)
  ) {
    return withReason(
      selection,
      entry,
      sourceCoverage.status,
      "hidden",
      {
        code: "source-not-connected",
        message: `Connect ${SOURCE_NAMES[selection.source]} to use this condition.`,
      },
    );
  }

  if (entry.placeRequired && selection.placeId === undefined) {
    return withReason(
      selection,
      entry,
      sourceCoverage.status,
      "hidden",
      {
        code: "place-required",
        message: "Choose a saved gym first.",
      },
    );
  }

  if (
    entry.placeRequired &&
    selection.placeId !== undefined &&
    !context.savedPlaceIds.includes(selection.placeId)
  ) {
    return withReason(
      selection,
      entry,
      sourceCoverage.status,
      "hidden",
      {
        code: "place-not-saved",
        message: "This saved gym is no longer available.",
      },
    );
  }

  if (!entry.placeRequired && selection.placeId !== undefined) {
    return withReason(
      selection,
      entry,
      sourceCoverage.status,
      "hidden",
      {
        code: "place-not-applicable",
        message: "This condition does not use a saved gym.",
      },
    );
  }

  for (const condition of context.conditions) {
    const overlap = conditionsOverlap(selection, condition);
    if (overlap === "duplicate") {
      return withReason(
        selection,
        entry,
        sourceCoverage.status,
        "taken",
        {
          code: "duplicate",
          message: "Already added for this source and place.",
        },
      );
    }
    if (overlap === "eventRate") {
      return withReason(
        selection,
        entry,
        sourceCoverage.status,
        "blocked",
        {
          code: "event-rate-overlap",
          message:
            "A goal and an exchange cannot use the same signal and source.",
        },
      );
    }
  }

  return {
    ...selection,
    name: entry.name,
    coverage: sourceCoverage.status,
    isRecommended: sourceCoverage.status === "promoted",
    status: "available",
  };
}

function sourcesFor(entry: CatalogEntry): readonly ConditionSource[] {
  const sources = new Set<ConditionSource>(entry.baseSources);
  if (isVendorSignal(entry.signal)) {
    for (const vendor of TIER_ONE_VENDORS) {
      sources.add(vendor);
    }
  }
  return [...sources];
}

export function listPickerVerdicts(
  context: PickerContext,
): readonly PickerVerdict[] {
  const verdicts: PickerVerdict[] = [];

  for (const entry of CONDITION_CATALOG) {
    for (const source of sourcesFor(entry)) {
      if (entry.placeRequired && context.savedPlaceIds.length > 0) {
        for (const placeId of context.savedPlaceIds) {
          verdicts.push(
            getPickerVerdict(
              {
                catalogId: entry.id as CatalogId,
                source,
                placeId,
              },
              context,
            ),
          );
        }
      } else {
        verdicts.push(
          getPickerVerdict(
            {
              catalogId: entry.id as CatalogId,
              source,
            },
            context,
          ),
        );
      }
    }
  }

  return verdicts;
}

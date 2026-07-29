import {
  getCatalogEntry,
  listPickerVerdicts,
  VENDOR_COVERAGE,
  VENDOR_SIGNALS,
  type ActivityGroup,
  type CatalogId,
  type ConditionKind,
  type ConditionSource,
  type PickerContext,
  type PickerCoverage,
  type PickerStatus,
  type PickerVerdict,
  type Signal,
  type TierOneVendorSource,
} from "@excerlock/condition-model";

/**
 * Builder step 1–2 as data.
 *
 * Every rule here comes from `listPickerVerdicts` — this file only groups the
 * verdicts by activity, drops the hidden ones, and orders what is left. It
 * decides nothing about availability; the builder screens render verdicts.
 */

const GROUP_TITLES: Readonly<Record<ActivityGroup, string>> = {
  gym: "Gym",
  walking: "Walking",
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
  universal: "Any activity",
  connected: "Connected apps",
};

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

export interface SourceOption {
  readonly source: ConditionSource;
  readonly placeId?: string;
  readonly label: string;
  readonly coverage: PickerCoverage;
  readonly isRecommended: boolean;
  readonly isDefaultSource: boolean;
  readonly status: PickerStatus;
  /** Why this source is greyed out — the picker's own wording. */
  readonly reason?: string;
  /** Why weak coverage is weak, so a selectable-but-lossy source says so. */
  readonly note?: string;
  readonly selectable: boolean;
}

export interface CatalogOption {
  readonly catalogId: CatalogId;
  readonly name: string;
  readonly kind: ConditionKind;
  readonly activity: ActivityGroup;
  readonly status: Exclude<PickerStatus, "hidden">;
  readonly reason?: string;
  readonly selectable: boolean;
  readonly sources: readonly SourceOption[];
}

export interface CatalogGroup {
  readonly activity: ActivityGroup;
  readonly title: string;
  readonly options: readonly CatalogOption[];
}

/** Every entry the user could reasonably see, grouped the way the sheet lists it. */
export function builderCatalog(context: PickerContext): readonly CatalogGroup[] {
  const byEntry = new Map<CatalogId, PickerVerdict[]>();
  for (const verdict of listPickerVerdicts(context)) {
    if (verdict.status === "hidden") {
      continue;
    }
    const verdicts = byEntry.get(verdict.catalogId) ?? [];
    verdicts.push(verdict);
    byEntry.set(verdict.catalogId, verdicts);
  }

  const groups = new Map<ActivityGroup, CatalogOption[]>();
  for (const [catalogId, verdicts] of byEntry) {
    const option = toOption(catalogId, verdicts);
    const options = groups.get(option.activity) ?? [];
    options.push(option);
    groups.set(option.activity, options);
  }

  return [...groups].map(([activity, options]) => ({
    activity,
    title: GROUP_TITLES[activity],
    options,
  }));
}

/** Find one entry across the grouped catalog — the builder and its tests both need it. */
export function findOption(
  groups: readonly CatalogGroup[],
  catalogId: string,
): CatalogOption | undefined {
  return groups
    .flatMap((group) => group.options)
    .find((option) => option.catalogId === catalogId);
}

function toOption(catalogId: CatalogId, verdicts: readonly PickerVerdict[]): CatalogOption {
  const entry = getCatalogEntry(catalogId);
  const sources = [...verdicts].sort(compareVerdicts).map((verdict) => toSourceOption(verdict, entry.signal));
  const status = statusOf(sources);
  const reason = sources.find((source) => source.status === status)?.reason;

  return {
    catalogId,
    name: entry.name,
    kind: entry.kind,
    activity: entry.activity,
    status,
    ...(reason === undefined ? {} : { reason }),
    selectable: status === "available",
    sources,
  };
}

function toSourceOption(verdict: PickerVerdict, signal: Signal): SourceOption {
  const note = weakCoverageReason(verdict.source, signal);
  return {
    source: verdict.source,
    ...(verdict.placeId === undefined ? {} : { placeId: verdict.placeId }),
    label: SOURCE_LABELS[verdict.source],
    coverage: verdict.coverage,
    isRecommended: verdict.isRecommended,
    isDefaultSource: verdict.isDefaultSource,
    status: verdict.status,
    ...(verdict.reason === undefined ? {} : { reason: verdict.reason.message }),
    ...(note === undefined ? {} : { note }),
    selectable: verdict.status === "available",
  };
}

/** The default source leads, promoted vendors come next, weak coverage sinks. */
function compareVerdicts(left: PickerVerdict, right: PickerVerdict): number {
  return (
    rank(right.isDefaultSource) - rank(left.isDefaultSource) ||
    rank(right.coverage === "promoted") - rank(left.coverage === "promoted")
  );
}

function rank(flag: boolean): number {
  return flag ? 1 : 0;
}

function statusOf(sources: readonly SourceOption[]): Exclude<PickerStatus, "hidden"> {
  if (sources.some(({ status }) => status === "available")) {
    return "available";
  }
  return sources.some(({ status }) => status === "taken") ? "taken" : "blocked";
}

function weakCoverageReason(source: ConditionSource, signal: Signal): string | undefined {
  if (!(source in VENDOR_COVERAGE) || !(VENDOR_SIGNALS as readonly Signal[]).includes(signal)) {
    return undefined;
  }
  const cell = VENDOR_COVERAGE[source as TierOneVendorSource][
    signal as (typeof VENDOR_SIGNALS)[number]
  ];
  return cell.status === "weak" ? cell.reason : undefined;
}

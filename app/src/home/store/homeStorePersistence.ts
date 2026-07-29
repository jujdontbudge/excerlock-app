import {
  getCatalogEntry,
  type ConfiguredCondition,
  type ConnectedExtraSource,
  type TierOneVendorSource,
} from "@excerlock/condition-model";
import { UNLIMITED, type Journal, type LedgerConfig } from "@excerlock/ledger";

import type { HomeStoreValues, SavedPlace } from "./homeState";

/**
 * Persisted state is untrusted: a retired catalog entry or a hand-edited blob
 * must degrade to the default rather than crash Home on launch.
 */
export function readPersistedHomeState(
  persistedState: unknown,
  fallbackBaseAllowanceMinutes: number,
): Partial<HomeStoreValues> {
  if (typeof persistedState !== "object" || persistedState === null) {
    return {};
  }

  const stored = persistedState as Partial<Record<keyof HomeStoreValues, unknown>>;
  // Built field by field, so the accumulator drops the `readonly` the store's
  // public shape carries; the returned value is read-only again.
  const values: { -readonly [K in keyof HomeStoreValues]?: HomeStoreValues[K] } = {};

  if (Array.isArray(stored.conditions)) {
    values.conditions = stored.conditions.filter(isKnownCondition);
  }
  if (typeof stored.allowanceBeforeFullLock === "number") {
    values.allowanceBeforeFullLock = stored.allowanceBeforeFullLock;
  }
  if (Array.isArray(stored.disabledConditionIds)) {
    values.disabledConditionIds = stored.disabledConditionIds.filter(
      (id): id is string => typeof id === "string",
    );
  }
  if (isJournal(stored.journal)) {
    values.journal = stored.journal;
  }
  const ledgerConfig = readLedgerConfig(
    stored.ledgerConfig,
    fallbackBaseAllowanceMinutes,
  );
  if (ledgerConfig !== undefined) {
    values.ledgerConfig = ledgerConfig;
  }
  if (Array.isArray(stored.savedPlaces)) {
    values.savedPlaces = stored.savedPlaces.filter(isSavedPlace);
  }
  if (Array.isArray(stored.connectedSources)) {
    values.connectedSources = stored.connectedSources.filter(
      (source): source is TierOneVendorSource | ConnectedExtraSource =>
        typeof source === "string",
    );
  }

  return values;
}

function isKnownCondition(value: unknown): value is ConfiguredCondition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, catalogId, settings } = value as Partial<ConfiguredCondition>;
  if (
    typeof id !== "string" ||
    typeof catalogId !== "string" ||
    settings === undefined
  ) {
    return false;
  }
  try {
    getCatalogEntry(catalogId);
    return true;
  } catch {
    return false;
  }
}

function isJournal(value: unknown): value is Journal {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Journal).entries)
  );
}

/**
 * `UNLIMITED` is `Infinity`, which JSON writes as `null` — the ledger README
 * makes mapping it back the persistence layer's job.
 */
function readLedgerConfig(
  value: unknown,
  fallbackBaseAllowanceMinutes: number,
): LedgerConfig | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const { dayBoundaryOffsetMinutes, baseAllowanceMinutes, rollover } =
    value as Partial<Record<keyof LedgerConfig, unknown>>;
  if (typeof dayBoundaryOffsetMinutes !== "number") {
    return undefined;
  }

  return {
    dayBoundaryOffsetMinutes,
    baseAllowanceMinutes:
      typeof baseAllowanceMinutes === "number"
        ? baseAllowanceMinutes
        : baseAllowanceMinutes === null
          ? UNLIMITED
          : fallbackBaseAllowanceMinutes,
    rollover: isRollover(rollover) ? rollover : null,
  };
}

function isRollover(value: unknown): value is { capMinutes: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { capMinutes?: unknown }).capMinutes === "number"
  );
}

function isSavedPlace(value: unknown): value is SavedPlace {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, name } = value as Partial<SavedPlace>;
  return typeof id === "string" && typeof name === "string";
}

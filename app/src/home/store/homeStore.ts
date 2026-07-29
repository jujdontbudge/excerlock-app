import {
  getCatalogEntry,
  type ConditionSource,
  type ConfiguredCondition,
  type ConnectedExtraSource,
  type ExistingCondition,
  type PickerContext,
  type TierOneVendorSource,
} from "@excerlock/condition-model";
import {
  appendEntries,
  dayIndexFor,
  emptyJournal,
  reduceLedger,
  UNLIMITED,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * The Phase-2 Home store: the conditions the user has built, the ledger journal
 * their earns land in, and the day's configuration. It orchestrates only —
 * every number it reports comes from `@excerlock/ledger`, and every rule it
 * applies comes from `@excerlock/condition-model`.
 *
 * Persistence is AsyncStorage. There is no server and no native signal here;
 * ledger persistence proper belongs to `app/src/ledger` in Phase 3.
 */

export interface SavedPlace {
  readonly id: string;
  readonly name: string;
}

export type HomeStoreValues = Readonly<{
  conditions: readonly ConfiguredCondition[];
  journal: Journal;
  ledgerConfig: LedgerConfig;
  connectedSources: readonly (TierOneVendorSource | ConnectedExtraSource)[];
  savedPlaces: readonly SavedPlace[];
}>;

/**
 * A new user starts empty (PRD §8, decided 2026-07-28) and under Full Lock, so
 * the hero means something before the allowance editor lands in Manage.
 */
export const DEFAULT_HOME_STATE: HomeStoreValues = Object.freeze({
  conditions: [],
  journal: emptyJournal(),
  ledgerConfig: Object.freeze({
    dayBoundaryOffsetMinutes: 0,
    baseAllowanceMinutes: 0,
    rollover: null,
  }),
  connectedSources: [],
  savedPlaces: [],
});

type HomeStore = HomeStoreValues & {
  addCondition: (condition: ConfiguredCondition) => void;
  removeCondition: (conditionId: string) => void;
  /** Bank an event condition's payout. Idempotent per condition per ledger day. */
  recordEventPayout: (conditionId: string, atMs: number) => void;
  /** Conditions the ledger paid out on the day containing `atMs`. */
  firedConditionIds: (atMs: number) => readonly string[];
  reset: () => void;
};

export const HOME_STORAGE_KEY = "excerlock.home.v1";

export const useHomeStore = create<HomeStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_HOME_STATE,

      addCondition: (condition) => {
        set(({ conditions }) =>
          conditions.some(({ id }) => id === condition.id)
            ? {}
            : { conditions: [...conditions, condition] },
        );
      },

      removeCondition: (conditionId) => {
        set(({ conditions }) => ({
          conditions: conditions.filter(({ id }) => id !== conditionId),
        }));
      },

      recordEventPayout: (conditionId, atMs) => {
        const { conditions, journal, ledgerConfig } = get();
        const condition = conditions.find(({ id }) => id === conditionId);
        if (condition === undefined || condition.settings.kind !== "event") {
          return;
        }

        const dayIndex = dayIndexFor(atMs, ledgerConfig.dayBoundaryOffsetMinutes);
        const { journal: next } = appendEntries(journal, [
          {
            kind: "earn",
            source: "home",
            id: `${conditionId}:${dayIndex}`,
            atMs,
            conditionId,
            payout: toLedgerPayout(condition.settings.reward),
          },
        ]);
        set({ journal: next });
      },

      firedConditionIds: (atMs) => {
        const { journal, ledgerConfig } = get();
        const days = reduceLedger(journal, ledgerConfig, atMs);
        const today = days[days.length - 1];
        if (today === undefined || dayIndexFor(atMs, ledgerConfig.dayBoundaryOffsetMinutes) !== today.dayIndex) {
          return [];
        }
        return Object.entries(today.perCondition)
          .filter(([, totals]) => totals.eventsFired > 0)
          .map(([conditionId]) => conditionId);
      },

      reset: () => {
        set(DEFAULT_HOME_STATE);
      },
    }),
    {
      name: HOME_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ conditions, journal, ledgerConfig, connectedSources, savedPlaces }) => ({
        conditions,
        journal,
        ledgerConfig,
        connectedSources,
        savedPlaces,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...readPersisted(persistedState),
      }),
    },
  ),
);

/** The context `listPickerVerdicts`/`getPickerVerdict` need to judge the catalog. */
export function selectPickerContext(state: HomeStoreValues): PickerContext {
  return {
    conditions: state.conditions.map(toExistingCondition),
    connectedSources: state.connectedSources,
    savedPlaceIds: state.savedPlaces.map(({ id }) => id),
  };
}

function toExistingCondition(condition: ConfiguredCondition): ExistingCondition {
  const { id, catalogId, source, placeId } = condition;
  return placeId === undefined
    ? { id, catalogId, source: source as ConditionSource }
    : { id, catalogId, source: source as ConditionSource, placeId };
}

function toLedgerPayout(reward: Extract<ConfiguredCondition["settings"], { kind: "event" }>["reward"]) {
  switch (reward.type) {
    case "fixedMinutes":
      return { type: "fixedChunk" as const, minutes: reward.minutes };
    case "restOfDay":
      return { type: "restOfDay" as const };
    case "setPeriod":
      return { type: "setPeriod" as const, minutes: reward.durationMinutes };
  }
}

/**
 * Persisted state is untrusted: a retired catalog entry or a hand-edited blob
 * must degrade to the default rather than crash Home on launch.
 */
function readPersisted(persistedState: unknown): Partial<HomeStoreValues> {
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
  if (isJournal(stored.journal)) {
    values.journal = stored.journal;
  }
  const ledgerConfig = readLedgerConfig(stored.ledgerConfig);
  if (ledgerConfig !== undefined) {
    values.ledgerConfig = ledgerConfig;
  }
  if (Array.isArray(stored.savedPlaces)) {
    values.savedPlaces = stored.savedPlaces.filter(isSavedPlace);
  }
  if (Array.isArray(stored.connectedSources)) {
    values.connectedSources = stored.connectedSources.filter(
      (source): source is TierOneVendorSource | ConnectedExtraSource => typeof source === "string",
    );
  }

  return values;
}

function isKnownCondition(value: unknown): value is ConfiguredCondition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, catalogId, settings } = value as Partial<ConfiguredCondition>;
  if (typeof id !== "string" || typeof catalogId !== "string" || settings === undefined) {
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
function readLedgerConfig(value: unknown): LedgerConfig | undefined {
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
          : DEFAULT_HOME_STATE.ledgerConfig.baseAllowanceMinutes,
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

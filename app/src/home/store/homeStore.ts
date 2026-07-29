import {
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

import {
  enterFullLock,
  exitFullLock,
  setBaseAllowance,
  type AllowanceValues,
} from "../model/allowance";
import { readPersistedHomeState } from "./homeStorePersistence";

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
  /**
   * What Full Lock's exit puts back (`null` = nothing remembered → unlimited).
   * It lives beside `ledgerConfig` because the allowance has exactly one owner:
   * see `model/allowance.ts` and `lock/controller/ledgerSource.ts`.
   */
  allowanceBeforeFullLock: number | null;
  /**
   * Conditions the user switched off in Manage. Off is not deleted: the
   * condition keeps its uniqueness key in the picker context, so its slot is
   * still taken and turning it back on restores exactly what was built.
   */
  disabledConditionIds: readonly string[];
  journal: Journal;
  ledgerConfig: LedgerConfig;
  connectedSources: readonly (TierOneVendorSource | ConnectedExtraSource)[];
  savedPlaces: readonly SavedPlace[];
}>;

/**
 * A new user starts empty with no app-chosen allowance (PRD §8, decided
 * 2026-07-28). Unlimited remains in force until they choose one in Manage.
 */
export const DEFAULT_HOME_STATE: HomeStoreValues = Object.freeze({
  conditions: [],
  allowanceBeforeFullLock: null,
  disabledConditionIds: [],
  journal: emptyJournal(),
  ledgerConfig: Object.freeze({
    dayBoundaryOffsetMinutes: 0,
    baseAllowanceMinutes: UNLIMITED,
    rollover: null,
  }),
  connectedSources: [],
  savedPlaces: [],
});

type HomeStore = HomeStoreValues & {
  /** Manage's allowance picker. Zero is Full Lock — the same transition. */
  setBaseAllowanceMinutes: (minutes: number) => void;
  /** PRD §3.2: entering Full Lock is setting the base allowance to zero. */
  setFullLock: (on: boolean) => void;
  addCondition: (condition: ConfiguredCondition) => void;
  /** Replace a condition in place — the edit path, so the id and slot survive. */
  updateCondition: (condition: ConfiguredCondition) => void;
  removeCondition: (conditionId: string) => void;
  setConditionEnabled: (conditionId: string, enabled: boolean) => void;
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

      setBaseAllowanceMinutes: (minutes) => {
        set((state) =>
          applyAllowance(state, setBaseAllowance(selectAllowance(state), minutes)),
        );
      },

      setFullLock: (on) => {
        set((state) =>
          applyAllowance(state, (on ? enterFullLock : exitFullLock)(selectAllowance(state))),
        );
      },

      addCondition: (condition) => {
        set(({ conditions }) =>
          conditions.some(({ id }) => id === condition.id)
            ? {}
            : { conditions: [...conditions, condition] },
        );
      },

      updateCondition: (condition) => {
        set(({ conditions }) => ({
          conditions: conditions.map((existing) =>
            existing.id === condition.id ? condition : existing,
          ),
        }));
      },

      removeCondition: (conditionId) => {
        set(({ conditions, disabledConditionIds }) => ({
          conditions: conditions.filter(({ id }) => id !== conditionId),
          disabledConditionIds: disabledConditionIds.filter((id) => id !== conditionId),
        }));
      },

      setConditionEnabled: (conditionId, enabled) => {
        set(({ disabledConditionIds }) => ({
          disabledConditionIds: enabled
            ? disabledConditionIds.filter((id) => id !== conditionId)
            : disabledConditionIds.includes(conditionId)
              ? disabledConditionIds
              : [...disabledConditionIds, conditionId],
        }));
      },

      recordEventPayout: (conditionId, atMs) => {
        const { conditions, disabledConditionIds, journal, ledgerConfig } = get();
        const condition = conditions.find(({ id }) => id === conditionId);
        if (condition === undefined || condition.settings.kind !== "event") {
          return;
        }
        // A switched-off condition earns nothing, whoever asks.
        if (disabledConditionIds.includes(conditionId)) {
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
      partialize: ({
        conditions,
        allowanceBeforeFullLock,
        disabledConditionIds,
        journal,
        ledgerConfig,
        connectedSources,
        savedPlaces,
      }) => ({
        conditions,
        allowanceBeforeFullLock,
        disabledConditionIds,
        journal,
        ledgerConfig,
        connectedSources,
        savedPlaces,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...readPersistedHomeState(
          persistedState,
          DEFAULT_HOME_STATE.ledgerConfig.baseAllowanceMinutes,
        ),
      }),
    },
  ),
);

/**
 * The allowance as one value, in the shape `model/allowance.ts` transitions.
 * Store-side only: it builds a fresh object, so a component reads the two fields
 * it needs rather than selecting this.
 */
export function selectAllowance(
  state: Pick<HomeStoreValues, "ledgerConfig" | "allowanceBeforeFullLock">,
): AllowanceValues {
  return {
    baseAllowanceMinutes: state.ledgerConfig.baseAllowanceMinutes,
    allowanceBeforeFullLock: state.allowanceBeforeFullLock,
  };
}

/** The allowance written back where the ledger reads it — never a second copy. */
function applyAllowance(
  state: Pick<HomeStoreValues, "ledgerConfig">,
  next: AllowanceValues,
): Partial<HomeStoreValues> {
  return {
    ledgerConfig: { ...state.ledgerConfig, baseAllowanceMinutes: next.baseAllowanceMinutes },
    allowanceBeforeFullLock: next.allowanceBeforeFullLock,
  };
}

/** The conditions that are switched on — the only ones Home renders or banks. */
export function selectActiveConditions(
  state: Pick<HomeStoreValues, "conditions" | "disabledConditionIds">,
): readonly ConfiguredCondition[] {
  return state.disabledConditionIds.length === 0
    ? state.conditions
    : state.conditions.filter(({ id }) => !state.disabledConditionIds.includes(id));
}

/** The context `listPickerVerdicts`/`getPickerVerdict` need to judge the catalog. */
export function selectPickerContext(
  state: Pick<HomeStoreValues, "conditions" | "connectedSources" | "savedPlaces">,
): PickerContext {
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

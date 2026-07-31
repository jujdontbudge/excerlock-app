import type { ConfiguredCondition } from "@excerlock/condition-model";
import {
  appendEntries,
  dayIndexFor,
  reduceLedger,
} from "@excerlock/ledger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  enterFullLock,
  exitFullLock,
  setBaseAllowance,
} from "../model/allowance";
import { healthEventJournalEntries } from "../model/healthEventClaims";
import { toLedgerPayout } from "../model/ledgerPayout";
import type { SignalReading } from "../model/reading";
import {
  applyAllowance,
  DEFAULT_HOME_STATE,
  selectActiveConditions,
  selectAllowance,
  type HomeStoreValues,
} from "./homeState";
import { readPersistedHomeState } from "./homeStorePersistence";
import type { BannerSelection } from "../banners/bannerCatalog";

/**
 * The Phase-2 Home store: the conditions the user has built, the ledger journal
 * their earns land in, and the day's configuration. It orchestrates only —
 * every number it reports comes from `@excerlock/ledger`, and every rule it
 * applies comes from `@excerlock/condition-model`.
 *
 * Persistence is AsyncStorage. There is no server and no native signal here;
 * ledger persistence proper belongs to `app/src/ledger` in Phase 3.
 */

type HomeStore = HomeStoreValues & {
  /** Manage's allowance picker. Zero is Full Lock — the same transition. */
  setBaseAllowanceMinutes: (minutes: number) => void;
  /** PRD §3.2: entering Full Lock is setting the base allowance to zero. */
  setFullLock: (on: boolean) => void;
  addCondition: (condition: ConfiguredCondition, banner?: BannerSelection) => void;
  /** Replace a condition in place — the edit path, so the id and slot survive. */
  updateCondition: (condition: ConfiguredCondition, banner?: BannerSelection) => void;
  removeCondition: (conditionId: string) => void;
  setConditionEnabled: (conditionId: string, enabled: boolean) => void;
  /** Bank an event condition's payout. Idempotent per condition per ledger day. */
  recordEventPayout: (conditionId: string, atMs: number) => void;
  /** Evaluate an on-device Health snapshot and bank any detected event outcomes. */
  claimHealthEvents: (reading: SignalReading, atMs: number) => void;
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

      addCondition: (condition, banner) => {
        set(({ conditions, conditionBanners }) =>
          conditions.some(({ id }) => id === condition.id)
            ? {}
            : {
                conditions: [...conditions, condition],
                ...(banner === undefined
                  ? {}
                  : { conditionBanners: { ...conditionBanners, [condition.id]: banner } }),
              },
        );
      },

      updateCondition: (condition, banner) => {
        set(({ conditions, conditionBanners }) => ({
          conditions: conditions.map((existing) =>
            existing.id === condition.id ? condition : existing,
          ),
          ...(banner === undefined
            ? {}
            : { conditionBanners: { ...conditionBanners, [condition.id]: banner } }),
        }));
      },

      removeCondition: (conditionId) => {
        set(({ conditions, conditionBanners, disabledConditionIds }) => {
          const { [conditionId]: _removed, ...remainingBanners } = conditionBanners;
          return {
          conditions: conditions.filter(({ id }) => id !== conditionId),
          conditionBanners: remainingBanners,
          disabledConditionIds: disabledConditionIds.filter((id) => id !== conditionId),
          };
        });
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

      claimHealthEvents: (reading, atMs) => {
        const state = get();
        const { journal } = appendEntries(
          state.journal,
          healthEventJournalEntries(
            selectActiveConditions(state),
            reading,
            atMs,
            state.ledgerConfig.dayBoundaryOffsetMinutes,
          ),
        );
        if (journal !== state.journal) {
          set({ journal });
        }
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
        conditionBanners,
        allowanceBeforeFullLock,
        disabledConditionIds,
        journal,
        ledgerConfig,
        connectedSources,
        savedPlaces,
      }) => ({
        conditions,
        conditionBanners,
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

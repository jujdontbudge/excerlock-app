import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  isMilestoneId,
  MILESTONES,
  type MilestoneId,
} from "./catalog";

export type MilestoneUnlockRecord = Readonly<{
  /** Supplied by the discovery edge; no selector or store reads a clock. */
  unlockedAtMs: number;
  /** Awaiting the next Analysis visit and its one animation sequence. */
  pending: boolean;
  /** Keeps the shelf glint until the badge itself is tapped. */
  isNew: boolean;
}>;

export type MilestoneUnlockRecords = Partial<
  Record<MilestoneId, MilestoneUnlockRecord>
>;

type MilestoneUnlockState = {
  records: MilestoneUnlockRecords;
  discoverUnlocks: (
    ids: readonly MilestoneId[],
    unlockedAtMs: number,
  ) => void;
  claimPending: () => readonly MilestoneId[];
  markTapped: (id: MilestoneId) => void;
};

export const MILESTONE_UNLOCK_STORAGE_KEY =
  "excerlock.analysis.milestone-unlocks.v1";

export const useMilestoneUnlockStore = create<MilestoneUnlockState>()(
  persist(
    (set, get) => ({
      records: {},

      discoverUnlocks: (ids, unlockedAtMs) => {
        if (!isUnlockInstant(unlockedAtMs)) return;

        const records = get().records;
        const undiscovered = ids.filter(
          (id) => isMilestoneId(id) && records[id] === undefined,
        );
        if (undiscovered.length === 0) return;

        set({
          records: undiscovered.reduce<MilestoneUnlockRecords>(
            (next, id) => ({
              ...next,
              [id]: { unlockedAtMs, pending: true, isNew: true },
            }),
            records,
          ),
        });
      },

      claimPending: () => {
        const pending = selectPendingMilestoneIds(get());
        if (pending.length === 0) return pending;

        set(({ records }) => ({
          records: pending.reduce<MilestoneUnlockRecords>(
            (next, id) => ({
              ...next,
              [id]: { ...next[id]!, pending: false },
            }),
            records,
          ),
        }));
        return pending;
      },

      markTapped: (id) => {
        set(({ records }) => {
          const record = records[id];
          return record === undefined || !record.isNew
            ? { records }
            : {
                records: {
                  ...records,
                  [id]: { ...record, isNew: false },
                },
              };
        });
      },
    }),
    {
      name: MILESTONE_UNLOCK_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ records }) => ({ records }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        records: readPersistedRecords(persistedState),
      }),
    },
  ),
);

export function selectPendingMilestoneIds(
  state: Pick<MilestoneUnlockState, "records">,
): MilestoneId[] {
  return MILESTONES.filter(({ id }) => state.records[id]?.pending).map(
    ({ id }) => id,
  );
}

export function selectNewMilestoneIds(
  state: Pick<MilestoneUnlockState, "records">,
): MilestoneId[] {
  return MILESTONES.filter(({ id }) => state.records[id]?.isNew).map(
    ({ id }) => id,
  );
}

function readPersistedRecords(persistedState: unknown): MilestoneUnlockRecords {
  if (typeof persistedState !== "object" || persistedState === null) return {};
  const records = Reflect.get(persistedState, "records");
  if (typeof records !== "object" || records === null) return {};

  return MILESTONES.reduce<MilestoneUnlockRecords>((valid, { id }) => {
    const record = Reflect.get(records, id);
    return isUnlockRecord(record) ? { ...valid, [id]: record } : valid;
  }, {});
}

function isUnlockRecord(value: unknown): value is MilestoneUnlockRecord {
  if (typeof value !== "object" || value === null) return false;
  return (
    isUnlockInstant(Reflect.get(value, "unlockedAtMs")) &&
    typeof Reflect.get(value, "pending") === "boolean" &&
    typeof Reflect.get(value, "isNew") === "boolean"
  );
}

function isUnlockInstant(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

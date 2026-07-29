import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { enterFullLock, exitFullLock, type AllowanceValues } from "../model/fullLock";

export const LOCK_STORAGE_KEY = "excerlock.lock.v1";

/**
 * A new user starts under Full Lock (PRD §3.2 and Home's own default), so the
 * lock surface means something before the allowance picker lands in Manage.
 */
export const DEFAULT_LOCK_STATE: AllowanceValues = Object.freeze({
  baseAllowanceMinutes: 0,
  allowanceBeforeFullLock: null,
});

type LockStore = AllowanceValues & {
  setFullLock: (on: boolean) => void;
};

export const useLockStore = create<LockStore>()(
  persist(
    (set) => ({
      ...DEFAULT_LOCK_STATE,
      setFullLock: (on) => {
        set(({ baseAllowanceMinutes, allowanceBeforeFullLock }) =>
          (on ? enterFullLock : exitFullLock)({
            baseAllowanceMinutes,
            allowanceBeforeFullLock,
          }),
        );
      },
    }),
    {
      name: LOCK_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ baseAllowanceMinutes, allowanceBeforeFullLock }) => ({
        baseAllowanceMinutes,
        allowanceBeforeFullLock,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...readPersisted(persistedState),
      }),
    },
  ),
);

/** A hand-edited blob must degrade to Full Lock rather than to unlimited time. */
function readPersisted(persistedState: unknown): Partial<AllowanceValues> {
  if (typeof persistedState !== "object" || persistedState === null) {
    return {};
  }
  return {
    baseAllowanceMinutes: readMinutes(
      Reflect.get(persistedState, "baseAllowanceMinutes"),
      DEFAULT_LOCK_STATE.baseAllowanceMinutes,
    ),
    allowanceBeforeFullLock: readMinutes(
      Reflect.get(persistedState, "allowanceBeforeFullLock"),
      null,
    ),
  };
}

function readMinutes(value: unknown, fallback: number | null): number | null {
  if (value === null) {
    return null;
  }
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

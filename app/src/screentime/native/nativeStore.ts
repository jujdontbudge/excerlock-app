import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DesiredOsState } from "@excerlock/ledger";
import type { StateStorage } from "zustand/middleware";

import type {
  ScreenTimeSelectionHandle,
} from "../ScreenTimeModule";
import {
  readSelectionContents,
  type SelectionContents,
} from "../selectionSummary";

export const NATIVE_SCREENTIME_STORAGE_KEY =
  "excerlock.screentime.native.v1";

export type NativeScheduledLockWindow = Readonly<{
  id: string;
  startsAtMs: number;
  endsAtMs: number;
  selection: ScreenTimeSelectionHandle;
}>;

export type NativePersistedState = Readonly<{
  selection: ScreenTimeSelectionHandle | null;
  desiredOsState: DesiredOsState;
  lockWindows: readonly NativeScheduledLockWindow[];
  selectionContents: Readonly<Record<string, SelectionContents>>;
}>;

const DEFAULT_STATE: NativePersistedState = Object.freeze({
  selection: null,
  desiredOsState: Object.freeze({ shields: "down", drainThresholds: [] }),
  lockWindows: [],
  selectionContents: {},
});

export function createNativeScreenTimePersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  let state = DEFAULT_STATE;
  let pending = Promise.resolve();

  return {
    getState: () => state,
    rehydrate: () => {
      pending = pending.then(async () => {
        const stored = await storage.getItem(NATIVE_SCREENTIME_STORAGE_KEY);
        state = readPersistedState(stored);
      });
      return pending;
    },
    update: (next: NativePersistedState) => {
      state = next;
      pending = pending.then(() =>
        storage.setItem(NATIVE_SCREENTIME_STORAGE_KEY, JSON.stringify(next)),
      );
      return pending;
    },
  };
}

function readPersistedState(stored: string | null): NativePersistedState {
  if (stored === null) {
    return DEFAULT_STATE;
  }
  try {
    const candidate: unknown = JSON.parse(stored);
    if (typeof candidate !== "object" || candidate === null) {
      return DEFAULT_STATE;
    }
    return {
      selection: readSelection(Reflect.get(candidate, "selection")),
      desiredOsState:
        readDesiredOsState(Reflect.get(candidate, "desiredOsState")) ??
        DEFAULT_STATE.desiredOsState,
      lockWindows: readLockWindows(Reflect.get(candidate, "lockWindows")),
      selectionContents: readSelectionContentsMap(
        Reflect.get(candidate, "selectionContents"),
      ),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function readSelection(value: unknown): ScreenTimeSelectionHandle | null {
  return typeof value === "string"
    ? (value as ScreenTimeSelectionHandle)
    : null;
}

function readDesiredOsState(value: unknown): DesiredOsState | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const shields = Reflect.get(value, "shields");
  const drainThresholds = Reflect.get(value, "drainThresholds");
  return (shields === "up" || shields === "down") &&
    Array.isArray(drainThresholds) &&
    drainThresholds.every(
      (threshold) => Number.isFinite(threshold) && threshold >= 0,
    )
    ? { shields, drainThresholds: [...drainThresholds] }
    : null;
}

function readLockWindows(value: unknown): NativeScheduledLockWindow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return [];
    }
    const id = Reflect.get(candidate, "id");
    const startsAtMs = Reflect.get(candidate, "startsAtMs");
    const endsAtMs = Reflect.get(candidate, "endsAtMs");
    const selection = readSelection(Reflect.get(candidate, "selection"));
    return typeof id === "string" &&
      id.trim().length > 0 &&
      Number.isFinite(startsAtMs) &&
      Number.isFinite(endsAtMs) &&
      startsAtMs < endsAtMs &&
      selection !== null
      ? [{ id, startsAtMs, endsAtMs, selection }]
      : [];
  });
}

function readSelectionContentsMap(
  value: unknown,
): Record<string, SelectionContents> {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([handle, contents]) => {
      const parsed = readSelectionContents(contents);
      return parsed === null ? [] : [[handle, parsed] as const];
    }),
  );
}

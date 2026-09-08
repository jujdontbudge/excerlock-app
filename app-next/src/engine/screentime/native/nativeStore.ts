import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

import type {
  ScreenTimeSelectionHandle,
  ShieldIntent,
} from "../ScreenTimeModule";
import {
  readSelectionContents,
  type SelectionContents,
} from "../selectionSummary";
import { readNativeSelectionHandle } from "./nativeSelection";

// v2 persists an intent plus named monitors; v1 persisted the retired
// drain ladder and caller-owned window ids, and is not read.
export const NATIVE_SCREENTIME_STORAGE_KEY =
  "excerlock.screentime.native.v2";

export type NativeScheduledMonitor = Readonly<{
  name: string;
  startsAtMs: number;
  endsAtMs: number;
  selection: ScreenTimeSelectionHandle;
}>;

export type NativePersistedState = Readonly<{
  selection: ScreenTimeSelectionHandle | null;
  desiredShields: ShieldIntent;
  monitors: readonly NativeScheduledMonitor[];
  selectionContents: Readonly<Record<string, SelectionContents>>;
}>;

const DEFAULT_STATE: NativePersistedState = Object.freeze({
  selection: null,
  desiredShields: "down",
  monitors: [],
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
      selection: readNativeSelectionHandle(Reflect.get(candidate, "selection")),
      desiredShields:
        readShieldIntent(Reflect.get(candidate, "desiredShields")) ??
        DEFAULT_STATE.desiredShields,
      monitors: readMonitors(Reflect.get(candidate, "monitors")),
      selectionContents: readSelectionContentsMap(
        Reflect.get(candidate, "selectionContents"),
      ),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function readShieldIntent(value: unknown): ShieldIntent | null {
  return value === "up" || value === "down" ? value : null;
}

function readMonitors(value: unknown): NativeScheduledMonitor[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return [];
    }
    const name = Reflect.get(candidate, "name");
    const startsAtMs = Reflect.get(candidate, "startsAtMs");
    const endsAtMs = Reflect.get(candidate, "endsAtMs");
    const selection = readNativeSelectionHandle(
      Reflect.get(candidate, "selection"),
    );
    return typeof name === "string" &&
      name.trim().length > 0 &&
      Number.isFinite(startsAtMs) &&
      Number.isFinite(endsAtMs) &&
      startsAtMs < endsAtMs &&
      selection !== null
      ? [{ name, startsAtMs, endsAtMs, selection }]
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
      const selection = readNativeSelectionHandle(handle);
      const parsed = readSelectionContents(contents);
      return selection === null || parsed === null
        ? []
        : [[selection, parsed] as const];
    }),
  );
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DesiredOsState } from "@excerlock/ledger";
import { createStore } from "zustand/vanilla";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type {
  LockWindow,
  ScreenTimeAuthorizationStatus,
  ScreenTimeSelectionHandle,
} from "./ScreenTimeModule";

export const MOCK_SCREENTIME_STORAGE_KEY = "excerlock.screentime.mock.v1";

export type ScheduledLockWindow = LockWindow & {
  readonly selection: ScreenTimeSelectionHandle;
};

export type MockPersistedState = {
  authorizationStatus: ScreenTimeAuthorizationStatus;
  selection: ScreenTimeSelectionHandle | null;
  desiredOsState: DesiredOsState;
  lockWindows: ScheduledLockWindow[];
  nextSelectionNumber: number;
};

const DEFAULT_PERSISTED_STATE: MockPersistedState = {
  authorizationStatus: "notDetermined",
  selection: null,
  desiredOsState: { shields: "down", drainThresholds: [] },
  lockWindows: [],
  nextSelectionNumber: 1,
};

class AwaitableStateStorage implements StateStorage<Promise<void>> {
  private pending = Promise.resolve();

  public constructor(
    private readonly storage: StateStorage<Promise<void>>,
  ) {}

  public async getItem(name: string): Promise<string | null> {
    await this.pending;
    return this.storage.getItem(name);
  }

  public setItem(name: string, value: string): Promise<void> {
    this.pending = this.pending.then(() => this.storage.setItem(name, value));
    return this.pending;
  }

  public removeItem(name: string): Promise<void> {
    this.pending = this.pending.then(() => this.storage.removeItem(name));
    return this.pending;
  }

  public flush(): Promise<void> {
    return this.pending;
  }
}

export function createMockScreenTimePersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  const awaitableStorage = new AwaitableStateStorage(storage);
  const store = createStore<MockPersistedState>()(
    persist(() => ({ ...DEFAULT_PERSISTED_STATE }), {
      name: MOCK_SCREENTIME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => awaitableStorage),
      skipHydration: true,
      partialize: (state) => ({
        authorizationStatus: state.authorizationStatus,
        selection: state.selection,
        desiredOsState: state.desiredOsState,
        lockWindows: state.lockWindows,
        nextSelectionNumber: state.nextSelectionNumber,
      }),
      merge: (persistedState, currentState) =>
        readPersistedState(persistedState, currentState),
    }),
  );

  return {
    getState: () => store.getState(),
    update: async (state: Partial<MockPersistedState>) => {
      store.setState(state);
      await awaitableStorage.flush();
    },
    rehydrate: async () => {
      await store.persist.rehydrate();
    },
  };
}

function readPersistedState(
  persistedState: unknown,
  fallback: MockPersistedState,
): MockPersistedState {
  if (typeof persistedState !== "object" || persistedState === null) {
    return fallback;
  }

  const authorizationStatus = Reflect.get(persistedState, "authorizationStatus");
  const selection = readSelection(Reflect.get(persistedState, "selection"));
  const desiredOsState = readDesiredOsState(
    Reflect.get(persistedState, "desiredOsState"),
  );
  const lockWindows = readLockWindows(Reflect.get(persistedState, "lockWindows"));
  const nextSelectionNumber = Reflect.get(
    persistedState,
    "nextSelectionNumber",
  );

  return {
    authorizationStatus: isAuthorizationStatus(authorizationStatus)
      ? authorizationStatus
      : fallback.authorizationStatus,
    selection,
    desiredOsState: desiredOsState ?? fallback.desiredOsState,
    lockWindows,
    nextSelectionNumber:
      Number.isInteger(nextSelectionNumber) && nextSelectionNumber > 0
        ? nextSelectionNumber
        : fallback.nextSelectionNumber,
  };
}

function isAuthorizationStatus(
  value: unknown,
): value is ScreenTimeAuthorizationStatus {
  return (
    value === "notDetermined" || value === "approved" || value === "denied"
  );
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
  if (
    (shields !== "up" && shields !== "down") ||
    !Array.isArray(drainThresholds) ||
    !drainThresholds.every((threshold) =>
      Number.isFinite(threshold) && threshold >= 0
    )
  ) {
    return null;
  }
  return { shields, drainThresholds: [...drainThresholds] };
}

function readLockWindows(value: unknown): ScheduledLockWindow[] {
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


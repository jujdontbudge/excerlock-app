import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "zustand/vanilla";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type { AccountSession } from "./AccountModule";

export const MOCK_ACCOUNT_STORAGE_KEY = "excerlock.account.mock.v1";

export type MockPersistedAccountState = {
  session: AccountSession;
};

const DEFAULT_PERSISTED_STATE: MockPersistedAccountState = {
  session: { status: "signedOut" },
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

export function createMockAccountPersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  const awaitableStorage = new AwaitableStateStorage(storage);
  const store = createStore<MockPersistedAccountState>()(
    persist(() => ({ ...DEFAULT_PERSISTED_STATE }), {
      name: MOCK_ACCOUNT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => awaitableStorage),
      skipHydration: true,
      partialize: (state) => ({ session: state.session }),
      merge: (persistedState, currentState) =>
        readPersistedState(persistedState, currentState),
    }),
  );

  return {
    getState: () => store.getState(),
    update: async (state: Partial<MockPersistedAccountState>) => {
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
  fallback: MockPersistedAccountState,
): MockPersistedAccountState {
  if (typeof persistedState !== "object" || persistedState === null) {
    return fallback;
  }

  return {
    session: readSession(Reflect.get(persistedState, "session")),
  };
}

function readSession(value: unknown): AccountSession {
  if (typeof value !== "object" || value === null) {
    return { status: "signedOut" };
  }
  if (Reflect.get(value, "status") !== "signedIn") {
    return { status: "signedOut" };
  }

  const user = Reflect.get(value, "user");
  const authenticatedAtMs = Reflect.get(value, "authenticatedAtMs");
  if (typeof user !== "object" || user === null) {
    return { status: "signedOut" };
  }
  const id = Reflect.get(user, "id");
  const email = Reflect.get(user, "email");
  return typeof id === "string" &&
    id.trim().length > 0 &&
    typeof email === "string" &&
    email.trim().length > 0 &&
    typeof authenticatedAtMs === "number" &&
    Number.isFinite(authenticatedAtMs) &&
    authenticatedAtMs >= 0
    ? {
        status: "signedIn",
        authenticatedAtMs,
        user: { id, email },
      }
    : { status: "signedOut" };
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "zustand/vanilla";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type { PremiumEntitlement } from "./SubscriptionModule";

export const MOCK_SUBSCRIPTION_STORAGE_KEY =
  "excerlock.subscription.mock.v1";

export type MockPersistedSubscriptionState = {
  entitlement: PremiumEntitlement;
};

const DEFAULT_PERSISTED_STATE: MockPersistedSubscriptionState = {
  entitlement: { status: "inactive" },
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

export function createMockSubscriptionPersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  const awaitableStorage = new AwaitableStateStorage(storage);
  const store = createStore<MockPersistedSubscriptionState>()(
    persist(() => ({ ...DEFAULT_PERSISTED_STATE }), {
      name: MOCK_SUBSCRIPTION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => awaitableStorage),
      skipHydration: true,
      partialize: (state) => ({ entitlement: state.entitlement }),
      merge: (persistedState, currentState) =>
        readPersistedState(persistedState, currentState),
    }),
  );

  return {
    getState: () => store.getState(),
    update: async (state: Partial<MockPersistedSubscriptionState>) => {
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
  fallback: MockPersistedSubscriptionState,
): MockPersistedSubscriptionState {
  if (typeof persistedState !== "object" || persistedState === null) {
    return fallback;
  }

  return {
    entitlement: readEntitlement(Reflect.get(persistedState, "entitlement")),
  };
}

function readEntitlement(value: unknown): PremiumEntitlement {
  if (typeof value !== "object" || value === null) {
    return { status: "inactive" };
  }
  if (Reflect.get(value, "status") !== "active") {
    return { status: "inactive" };
  }

  const productId = Reflect.get(value, "productId");
  const purchasedAtMs = Reflect.get(value, "purchasedAtMs");
  const renewsAtMs = Reflect.get(value, "renewsAtMs");
  return typeof productId === "string" &&
    productId.trim().length > 0 &&
    Number.isFinite(purchasedAtMs) &&
    Number.isFinite(renewsAtMs) &&
    purchasedAtMs < renewsAtMs
    ? { status: "active", productId, purchasedAtMs, renewsAtMs }
    : { status: "inactive" };
}

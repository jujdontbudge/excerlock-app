import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "zustand/vanilla";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import { isNotificationTypeId } from "../model/catalog";
import type {
  DeliveryRecord,
  ScheduledNotification,
} from "../NotificationModule";

export const NATIVE_NOTIFICATIONS_STORAGE_KEY =
  "excerlock.notifications.native.v1";

type NativeNotificationState = {
  scheduled: ScheduledNotification[];
  deliveries: DeliveryRecord[];
};

const DEFAULT_STATE: NativeNotificationState = {
  scheduled: [],
  deliveries: [],
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

export function createNativeNotificationPersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  const awaitableStorage = new AwaitableStateStorage(storage);
  const store = createStore<NativeNotificationState>()(
    persist(() => ({ ...DEFAULT_STATE }), {
      name: NATIVE_NOTIFICATIONS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => awaitableStorage),
      skipHydration: true,
      partialize: ({ scheduled, deliveries }) => ({ scheduled, deliveries }),
      merge: (persistedState, currentState) =>
        readPersistedState(persistedState, currentState),
    }),
  );

  return {
    getState: () => store.getState(),
    update: async (state: Partial<NativeNotificationState>) => {
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
  fallback: NativeNotificationState,
): NativeNotificationState {
  if (typeof persistedState !== "object" || persistedState === null) {
    return fallback;
  }

  return {
    scheduled: readScheduled(Reflect.get(persistedState, "scheduled")),
    deliveries: readDeliveries(Reflect.get(persistedState, "deliveries")),
  };
}

function readScheduled(value: unknown): ScheduledNotification[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isScheduledNotification);
}

function isScheduledNotification(value: unknown): value is ScheduledNotification {
  if (typeof value !== "object" || value === null) return false;
  const content = Reflect.get(value, "content");
  return (
    typeof Reflect.get(value, "id") === "string" &&
    isNotificationTypeId(Reflect.get(value, "typeId")) &&
    typeof content === "object" &&
    content !== null &&
    typeof Reflect.get(content, "title") === "string" &&
    typeof Reflect.get(content, "body") === "string" &&
    typeof Reflect.get(value, "route") === "string" &&
    Number.isFinite(Reflect.get(value, "deliverAtMs"))
  );
}

function readDeliveries(value: unknown): DeliveryRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isDeliveryRecord);
}

function isDeliveryRecord(value: unknown): value is DeliveryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "id") === "string" &&
    isNotificationTypeId(Reflect.get(value, "typeId")) &&
    Number.isFinite(Reflect.get(value, "deliveredAtMs"))
  );
}

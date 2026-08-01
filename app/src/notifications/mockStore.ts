import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "zustand/vanilla";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import { getNotificationType, isNotificationTypeId } from "./model/catalog";
import type {
  DeliveryRecord,
  NotificationAuthorizationStatus,
  ScheduledNotification,
} from "./NotificationModule";

export const MOCK_NOTIFICATIONS_STORAGE_KEY =
  "excerlock.notifications.mock.v1";

export type MockNotificationState = {
  authorizationStatus: NotificationAuthorizationStatus;
  scheduled: ScheduledNotification[];
  deliveries: DeliveryRecord[];
};

const DEFAULT_STATE: MockNotificationState = {
  authorizationStatus: "notDetermined",
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

export function createMockNotificationPersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  const awaitableStorage = new AwaitableStateStorage(storage);
  const store = createStore<MockNotificationState>()(
    persist(() => ({ ...DEFAULT_STATE }), {
      name: MOCK_NOTIFICATIONS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => awaitableStorage),
      skipHydration: true,
      partialize: ({ authorizationStatus, scheduled, deliveries }) => ({
        authorizationStatus,
        scheduled,
        deliveries,
      }),
      merge: (persistedState, currentState) =>
        readPersistedState(persistedState, currentState),
    }),
  );

  return {
    getState: () => store.getState(),
    update: async (state: Partial<MockNotificationState>) => {
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
  fallback: MockNotificationState,
): MockNotificationState {
  if (typeof persistedState !== "object" || persistedState === null) {
    return fallback;
  }

  const authorizationStatus = Reflect.get(
    persistedState,
    "authorizationStatus",
  );
  return {
    authorizationStatus: isAuthorizationStatus(authorizationStatus)
      ? authorizationStatus
      : fallback.authorizationStatus,
    scheduled: readScheduled(Reflect.get(persistedState, "scheduled")),
    deliveries: readDeliveries(Reflect.get(persistedState, "deliveries")),
  };
}

function isAuthorizationStatus(
  value: unknown,
): value is NotificationAuthorizationStatus {
  return (
    value === "notDetermined" || value === "approved" || value === "denied"
  );
}

function readScheduled(value: unknown): ScheduledNotification[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return [];
    }
    const id = Reflect.get(candidate, "id");
    const typeId = Reflect.get(candidate, "typeId");
    const content = Reflect.get(candidate, "content");
    const route = Reflect.get(candidate, "route");
    const deliverAtMs = Reflect.get(candidate, "deliverAtMs");
    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      !isNotificationTypeId(typeId) ||
      typeof content !== "object" ||
      content === null ||
      typeof Reflect.get(content, "title") !== "string" ||
      typeof Reflect.get(content, "body") !== "string" ||
      route !== getNotificationType(typeId).route ||
      !Number.isFinite(deliverAtMs)
    ) {
      return [];
    }
    return [
      {
        id,
        typeId,
        content: {
          title: Reflect.get(content, "title"),
          body: Reflect.get(content, "body"),
        },
        route,
        deliverAtMs,
      },
    ];
  });
}

function readDeliveries(value: unknown): DeliveryRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return [];
    }
    const id = Reflect.get(candidate, "id");
    const typeId = Reflect.get(candidate, "typeId");
    const deliveredAtMs = Reflect.get(candidate, "deliveredAtMs");
    return typeof id === "string" &&
      id.trim().length > 0 &&
      isNotificationTypeId(typeId) &&
      Number.isFinite(deliveredAtMs)
      ? [{ id, typeId, deliveredAtMs }]
      : [];
  });
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Validators<T> = { [K in keyof T]: (value: unknown) => boolean };
export type DataStore<T> = { data: T; patch: (value: Partial<T>) => void; reset: () => void };
export type PersistenceBarrier = { persistBarrier(): Promise<void>; retryPersistence(): Promise<void> };
export type StoreHooks<T> = {
  /** Safety-critical owners may require an explicit awaited durability transaction. */
  manualPersistence?: boolean;
  /** Per-row filtering applied to in-memory patches and hydrated payloads before validation,
      so one malformed row can never erase the valid rows beside it. */
  sanitize?: (value: Partial<T>) => Partial<T>;
  /** One-way upgrade of stale persisted payloads, applied only at hydration before sanitize. */
  migrate?: (persisted: unknown) => unknown;
};
export function createPersistedStore<T extends object>(
  name: string,
  initial: T,
  validators: Validators<T>,
  hooks?: StoreHooks<T>,
) {
  type StorageOperation =
    | { kind: 'set'; key: string; value: string; status: 'pending' | 'succeeded' | 'failed' }
    | { kind: 'remove'; key: string; status: 'pending' | 'succeeded' | 'failed' };
  let writeTail: Promise<void> = Promise.resolve();
  let latestWrite: Promise<void> = writeTail;
  let latestOperation: StorageOperation | null = null;
  const perform = async (operation: StorageOperation): Promise<void> => {
    operation.status = 'pending';
    try {
      if (operation.kind === 'set') await AsyncStorage.setItem(operation.key, operation.value);
      else await AsyncStorage.removeItem(operation.key);
      operation.status = 'succeeded';
    } catch (error) {
      operation.status = 'failed';
      throw error;
    }
  };
  const enqueue = (operation: StorageOperation): Promise<void> => {
    latestOperation = operation;
    const write = writeTail.then(() => perform(operation));
    writeTail = write.catch(() => undefined);
    latestWrite = write;
    return write;
  };
  const serializedStorage = {
    getItem: async (key: string) => {
      await writeTail;
      return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
      return enqueue({ kind: 'set', key, value, status: 'pending' });
    },
    removeItem: (key: string) => {
      return enqueue({ kind: 'remove', key, status: 'pending' });
    },
  };
  const fresh = (): T => JSON.parse(JSON.stringify(initial));
  const validated = (value: unknown, base: T): T => {
    const result = { ...base };
    if (typeof value !== 'object' || value === null) return result;
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const field = (value as T)[key];
      if (validators[key](field)) result[key] = field;
    }
    return result;
  };
  const store = create<DataStore<T>>()(
    persist(
      (set) => ({
        data: fresh(),
        patch: (value) => set((state) => ({ data: validated(hooks?.sanitize?.(value) ?? value, state.data) })),
        reset: () => set({ data: fresh() }),
      }),
      {
        name: `excerlock-next.${name}.v1`,
        storage: createJSONStorage(() => hooks?.manualPersistence ? {
          getItem: (key) => AsyncStorage.getItem(key),
          removeItem: (key) => AsyncStorage.removeItem(key),
          // The owner persists complete snapshots explicitly. An automatic late
          // middleware write must not overwrite its committed intent/cursor.
          setItem: async () => {},
        } : serializedStorage),
        partialize: (state) => ({ data: state.data }),
        merge: (persisted, current) => {
          const raw = (persisted as { data?: unknown } | null)?.data;
          const migrated = hooks?.migrate ? hooks.migrate(raw) : raw;
          const partial = (typeof migrated === 'object' && migrated !== null ? migrated : {}) as Partial<T>;
          return { ...current, data: validated(hooks?.sanitize?.(partial) ?? partial, fresh()) };
        },
      },
    ),
  );
  const retryPersistence = (): Promise<void> => {
    const retry = writeTail.then(async () => {
      const operation = latestOperation;
      // A newer middleware write queued after this retry request owns
      // durability. Never replay the older failed snapshot ahead of it.
      if (!operation || operation.status !== 'failed') return;
      await perform(operation);
    });
    writeTail = retry.catch(() => undefined);
    latestWrite = retry;
    return retry;
  };
  return Object.assign(store, { persistBarrier: () => latestWrite, retryPersistence });
}

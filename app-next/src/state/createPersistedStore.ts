import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Validators<T> = { [K in keyof T]: (value: unknown) => boolean };
export type DataStore<T> = { data: T; patch: (value: Partial<T>) => void; reset: () => void };
export type PersistenceBarrier = { persistBarrier(): Promise<void> };
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
  let writeTail: Promise<void> = Promise.resolve();
  let latestWrite: Promise<void> = writeTail;
  const serializedStorage = {
    getItem: async (key: string) => {
      await writeTail;
      return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
      const write = writeTail.then(() => AsyncStorage.setItem(key, value));
      writeTail = write.catch(() => undefined);
      latestWrite = write;
      return write;
    },
    removeItem: (key: string) => {
      const write = writeTail.then(() => AsyncStorage.removeItem(key));
      writeTail = write.catch(() => undefined);
      latestWrite = write;
      return write;
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
  return Object.assign(store, { persistBarrier: () => latestWrite });
}

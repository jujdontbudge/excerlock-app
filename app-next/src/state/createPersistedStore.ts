import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Validators<T> = { [K in keyof T]: (value: unknown) => boolean };
export type DataStore<T> = { data: T; patch: (value: Partial<T>) => void; reset: () => void };
export function createPersistedStore<T extends object>(name: string, initial: T, validators: Validators<T>) {
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
  return create<DataStore<T>>()(
    persist(
      (set) => ({
        data: fresh(),
        patch: (value) => set((state) => ({ data: validated(value, state.data) })),
        reset: () => set({ data: fresh() }),
      }),
      {
        name: `excerlock-next.${name}.v1`,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({ data: state.data }),
        merge: (persisted, current) => ({
          ...current,
          data: validated((persisted as { data?: unknown } | null)?.data, fresh()),
        }),
      },
    ),
  );
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrationReport, PersistError } from './hydrationReport';
import { ValidationResult } from './validation';
export { PersistError } from './hydrationReport';
export type Validator<T> = (value: unknown) => boolean | ValidationResult<T>;
export type Validators<T> = { [K in keyof T]: Validator<T[K]> };
export type Migration = (raw: unknown) => unknown;
export type DataStore<T> = { data: T; rejected: unknown[]; patch: (value: Partial<T>) => void; reset: () => void };
export type StoreDefinition<T> = {
  name: string;
  initial: T;
  schemaVersion: number;
  migrations: Record<number, Migration>;
  validators: Validators<T>;
};
export function defineStore<T extends object>({
  name,
  initial,
  schemaVersion,
  migrations,
  validators,
}: StoreDefinition<T>) {
  const fresh = (): T => JSON.parse(JSON.stringify(initial));
  const validated = (value: unknown, base: T): { data: T; rejected: unknown[] } => {
    const result = { ...base };
    const rejected: unknown[] = [];
    if (typeof value !== 'object' || value === null) return { data: result, rejected };
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const field = (value as T)[key];
      const validation = validators[key](field);
      if (typeof validation === 'boolean') {
        if (validation) result[key] = field;
      } else {
        rejected.push(...validation.dropped);
        if (validation.ok) result[key] = validation.value;
      }
    }
    return { data: result, rejected };
  };
  const storage = createJSONStorage(() => ({
    ...AsyncStorage,
    setItem: async (key: string, value: string) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (cause) {
        hydrationReport.getState().recordWriteError(new PersistError(name, cause));
      }
    },
  }));
  return create<DataStore<T>>()(
    persist(
      (set) => ({
        data: fresh(),
        rejected: [],
        patch: (value) => set((state) => ({ data: validated(value, state.data).data })),
        reset: () => set({ data: fresh(), rejected: [] }),
      }),
      {
        name: `excerlock-next.${name}.v1`,
        version: schemaVersion,
        storage,
        partialize: (state) => ({ data: state.data }),
        migrate: (persisted, fromVersion) => {
          let raw = (persisted as { data?: unknown } | null)?.data;
          for (let version = fromVersion; version < schemaVersion; version += 1) {
            const migrate = migrations[version];
            if (!migrate) throw new Error(`Missing ${name} migration from schema ${version}`);
            raw = migrate(raw);
          }
          return { ...(persisted as object), data: raw };
        },
        merge: (persisted, current) => {
          const result = validated((persisted as { data?: unknown } | null)?.data, fresh());
          hydrationReport.getState().recordDropped(name, result.rejected.length);
          return { ...current, data: result.data, rejected: result.rejected };
        },
      },
    ),
  );
}

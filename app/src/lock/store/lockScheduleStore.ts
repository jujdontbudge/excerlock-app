import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  saveRecurringLockWindow,
  WEEKDAYS,
  type RecurringLockWindow,
  type SaveRecurringLockWindowResult,
  type Weekday,
} from "../model/recurringLockWindow";

export const LOCK_SCHEDULE_STORAGE_KEY = "excerlock.lock.schedule.v1";

interface LockScheduleStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LockScheduleSnapshot {
  readonly ready: boolean;
  readonly windows: readonly RecurringLockWindow[];
}

const INITIAL: LockScheduleSnapshot = Object.freeze({
  ready: false,
  windows: Object.freeze([]),
});

/**
 * The persisted owner of recurring definitions. ScreenTime owns only the
 * concrete instances generated from this schedule.
 */
export class LockScheduleStore {
  private snapshot: LockScheduleSnapshot = INITIAL;
  private readonly listeners = new Set<() => void>();
  private loadPromise: Promise<void> | undefined;
  private mutations: Promise<void> = Promise.resolve();

  public constructor(
    private readonly storage: LockScheduleStorage = AsyncStorage,
  ) {}

  public getSnapshot(): LockScheduleSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public load(): Promise<void> {
    this.loadPromise ??= this.readPersisted();
    return this.loadPromise;
  }

  public save(
    candidate: RecurringLockWindow,
  ): Promise<SaveRecurringLockWindowResult> {
    return this.enqueue(async () => {
      await this.load();
      const result = saveRecurringLockWindow(
        this.snapshot.windows,
        candidate,
      );
      if (result.ok === false) {
        return result;
      }
      const windows = freezeWindows(result.windows);
      await this.persist(windows);
      this.publish(windows);
      return { ok: true as const, windows };
    });
  }

  public delete(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      await this.load();
      const windows = this.snapshot.windows.filter(
        (window) => window.id !== id,
      );
      if (windows.length === this.snapshot.windows.length) {
        return false;
      }
      const frozen = freezeWindows(windows);
      await this.persist(frozen);
      this.publish(frozen);
      return true;
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutations.then(operation, operation);
    this.mutations = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async readPersisted(): Promise<void> {
    let windows: readonly RecurringLockWindow[] = [];
    try {
      const raw = await this.storage.getItem(LOCK_SCHEDULE_STORAGE_KEY);
      windows = readWindows(raw);
    } catch {
      // A corrupt or unavailable local cache must not strand the lock screen.
    }
    this.snapshot = Object.freeze({
      ready: true,
      windows: freezeWindows(windows),
    });
    this.listeners.forEach((listener) => listener());
  }

  private async persist(
    windows: readonly RecurringLockWindow[],
  ): Promise<void> {
    await this.storage.setItem(
      LOCK_SCHEDULE_STORAGE_KEY,
      JSON.stringify({ version: 1, windows }),
    );
  }

  private publish(windows: readonly RecurringLockWindow[]): void {
    this.snapshot = Object.freeze({ ready: true, windows });
    this.listeners.forEach((listener) => listener());
  }
}

function readWindows(raw: string | null): readonly RecurringLockWindow[] {
  if (raw === null) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      Reflect.get(value, "version") !== 1
    ) {
      return [];
    }
    const candidates = Reflect.get(value, "windows");
    if (!Array.isArray(candidates)) {
      return [];
    }
    return candidates.reduce<readonly RecurringLockWindow[]>(
      (accepted, candidate) => {
        const parsed = readWindow(candidate);
        if (parsed === null) {
          return accepted;
        }
        const result = saveRecurringLockWindow(accepted, parsed);
        return result.ok ? result.windows : accepted;
      },
      [],
    );
  } catch {
    return [];
  }
}

function readWindow(value: unknown): RecurringLockWindow | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const id = Reflect.get(value, "id");
  const days = Reflect.get(value, "days");
  const startMinute = Reflect.get(value, "startMinute");
  const endMinute = Reflect.get(value, "endMinute");
  if (
    typeof id !== "string" ||
    !Array.isArray(days) ||
    !days.every(isWeekday) ||
    typeof startMinute !== "number" ||
    typeof endMinute !== "number"
  ) {
    return null;
  }
  return { id, days, startMinute, endMinute };
}

function isWeekday(value: unknown): value is Weekday {
  return (
    typeof value === "string" &&
    (WEEKDAYS as readonly string[]).includes(value)
  );
}

function freezeWindows(
  windows: readonly RecurringLockWindow[],
): readonly RecurringLockWindow[] {
  return Object.freeze(
    windows.map((window) =>
      Object.freeze({
        ...window,
        days: Object.freeze([...window.days]),
      }),
    ),
  );
}

let sharedStore: LockScheduleStore | undefined;

export function getLockScheduleStore(): LockScheduleStore {
  sharedStore ??= new LockScheduleStore();
  return sharedStore;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GymTransitionRecord, GymVisitLog } from './GymVisitLog';
export const GYM_VISIT_LOG_STORAGE_KEY = '@excerlock/location/gym-transitions/v2';
export const LEGACY_GYM_VISIT_LOG_STORAGE_KEY = '@excerlock/location/confirmed-gym-visits/v1';
export class AsyncStorageGymVisitLog implements GymVisitLog {
  private writes: Promise<void> = Promise.resolve();
  append(record: GymTransitionRecord): Promise<void> {
    const safe = coordinateFree(record);
    const write = this.writes.then(async () => {
      const records = await readStored();
      if (records.some(({ id }) => id === safe.id)) return;
      await AsyncStorage.setItem(GYM_VISIT_LOG_STORAGE_KEY, JSON.stringify([...records, safe]));
    });
    this.writes = write.catch(() => undefined);
    return write;
  }
  async readAll(): Promise<readonly GymTransitionRecord[]> {
    await this.writes;
    return readStored();
  }
  reset(): Promise<void> {
    const write = this.writes.catch(() => undefined).then(() =>
      AsyncStorage.multiRemove([GYM_VISIT_LOG_STORAGE_KEY, LEGACY_GYM_VISIT_LOG_STORAGE_KEY]));
    this.writes = write.catch(() => undefined);
    return write;
  }
}
function coordinateFree(record: GymTransitionRecord): GymTransitionRecord {
  return {
    id: record.id,
    regionId: record.regionId,
    type: record.type,
    atMs: record.atMs,
    receivedAtMs: record.receivedAtMs,
  };
}
async function readStored(): Promise<readonly GymTransitionRecord[]> {
  const stored = await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY);
  if (stored !== null) {
    try {
      const value: unknown = JSON.parse(stored);
      return Array.isArray(value) ? value.filter(isRecord) : [];
    } catch {
      return [];
    }
  }
  const legacy = await AsyncStorage.getItem(LEGACY_GYM_VISIT_LOG_STORAGE_KEY);
  if (legacy === null) return [];
  try {
    const value: unknown = JSON.parse(legacy);
    return Array.isArray(value)
      ? value.filter(isLegacy).map((row, index) => ({
          id: `legacy:${row.regionId}:${row.atMs}:${index}`,
          regionId: row.regionId,
          type: 'enter' as const,
          atMs: row.atMs,
          receivedAtMs: row.atMs,
        }))
      : [];
  } catch {
    return [];
  }
}
function isRecord(value: unknown): value is GymTransitionRecord {
  if (!isLegacy(value)) return false;
  const row = value as Partial<GymTransitionRecord>;
  return (
    typeof row.id === 'string' &&
    (row.type === 'enter' || row.type === 'exit') &&
    typeof row.receivedAtMs === 'number' &&
    Number.isFinite(row.receivedAtMs)
  );
}
function isLegacy(value: unknown): value is { regionId: string; atMs: number } {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as { regionId?: unknown; atMs?: unknown };
  return typeof row.regionId === 'string' && typeof row.atMs === 'number' && Number.isFinite(row.atMs);
}

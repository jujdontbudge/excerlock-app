import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GymTransitionRecord, GymVisitLog } from './GymVisitLog';
export const GYM_VISIT_LOG_STORAGE_KEY = '@excerlock/location/gym-transitions/v2';
export const LEGACY_GYM_VISIT_LOG_STORAGE_KEY = '@excerlock/location/confirmed-gym-visits/v1';
export const GYM_VISIT_LOG_ACCEPTANCE_KEY = '@excerlock/location/gym-transitions-acceptance/v1';
export const GYM_VISIT_LOG_PRUNED_THROUGH_KEY = '@excerlock/location/gym-transitions-pruned-through/v1';
type GymVisitAcceptance = Readonly<{ epoch: number; regionIds: readonly string[] }>;

// TaskManager and the foreground runtime intentionally construct separate log
// objects. Their storage operations must nevertheless have one ordering spine.
let sharedWrites: Promise<void> = Promise.resolve();

function serialize(work: () => Promise<void>): Promise<void> {
  const write = sharedWrites.catch(() => undefined).then(work);
  sharedWrites = write.catch(() => undefined);
  return write;
}

/** Persistently reject task deliveries until the next account explicitly
 * registers its gyms. The marker survives a cold headless task process. */
export function suspendGymVisitLogWritesAndReset(): Promise<void> {
  return serialize(async () => {
    const previous = parseAcceptance(await AsyncStorage.getItem(GYM_VISIT_LOG_ACCEPTANCE_KEY));
    const epoch = (previous?.epoch ?? 0) + 1;
    await AsyncStorage.setItem(GYM_VISIT_LOG_ACCEPTANCE_KEY, JSON.stringify({ epoch, regionIds: [] }));
    await AsyncStorage.multiRemove([GYM_VISIT_LOG_STORAGE_KEY, LEGACY_GYM_VISIT_LOG_STORAGE_KEY, GYM_VISIT_LOG_PRUNED_THROUGH_KEY]);
  });
}

/** Accept only regions successfully registered for the next account. An empty
 * registration deliberately remains suspended. */
export function resumeGymVisitLogWrites(regionIds: readonly string[]): Promise<void> {
  return serialize(async () => {
    const previous = parseAcceptance(await AsyncStorage.getItem(GYM_VISIT_LOG_ACCEPTANCE_KEY));
    const acceptance: GymVisitAcceptance = {
      epoch: previous?.epoch ?? 0,
      regionIds: [...new Set(regionIds.filter((id) => id.length > 0))],
    };
    await AsyncStorage.setItem(GYM_VISIT_LOG_ACCEPTANCE_KEY, JSON.stringify(acceptance));
  });
}

export class AsyncStorageGymVisitLog implements GymVisitLog {
  append(record: GymTransitionRecord): Promise<void> {
    const safe = coordinateFree(record);
    return serialize(async () => {
      const storedAcceptance = await AsyncStorage.getItem(GYM_VISIT_LOG_ACCEPTANCE_KEY);
      // A missing marker preserves pre-upgrade behavior. Once deletion writes an
      // epoch, every later callback must belong to that epoch's registered set.
      if (storedAcceptance !== null) {
        const acceptance = parseAcceptance(storedAcceptance);
        if (!acceptance?.regionIds.includes(safe.regionId)) return;
      }
      const rawPrunedThrough = await AsyncStorage.getItem(GYM_VISIT_LOG_PRUNED_THROUGH_KEY);
      const prunedThrough = rawPrunedThrough === null ? null : Number(rawPrunedThrough);
      if (prunedThrough !== null && Number.isFinite(prunedThrough) && safe.atMs < prunedThrough) return;
      const records = await readStored();
      if (records.some(({ id }) => id === safe.id)) return;
      await AsyncStorage.setItem(GYM_VISIT_LOG_STORAGE_KEY, JSON.stringify([...records, safe]));
    });
  }
  async readAll(): Promise<readonly GymTransitionRecord[]> {
    await sharedWrites;
    return readStored();
  }
  reset(): Promise<void> {
    return serialize(() =>
      AsyncStorage.multiRemove([GYM_VISIT_LOG_STORAGE_KEY, LEGACY_GYM_VISIT_LOG_STORAGE_KEY, GYM_VISIT_LOG_PRUNED_THROUGH_KEY]));
  }
  /** Call only after intervals before cutoff are sealed into retained history. */
  pruneBefore(cutoffMs: number): Promise<readonly GymTransitionRecord[]> {
    return serialize(async () => {
      if (!Number.isFinite(cutoffMs)) throw new Error('Invalid gym retention cutoff');
      const records = await readStored();
      const retained = retainGymTransitions(records, cutoffMs);
      await AsyncStorage.setItem(GYM_VISIT_LOG_STORAGE_KEY, JSON.stringify(retained));
      await AsyncStorage.setItem(GYM_VISIT_LOG_PRUNED_THROUGH_KEY, String(cutoffMs));
      await AsyncStorage.removeItem(LEGACY_GYM_VISIT_LOG_STORAGE_KEY);
      return retained;
    });
  }
}
export function retainGymTransitions(records: readonly GymTransitionRecord[], cutoffMs: number): GymTransitionRecord[] {
  const retained = records.filter(({ atMs }) => atMs >= cutoffMs);
  const regions = new Set(records.map(({ regionId }) => regionId));
  for (const regionId of regions) {
    const boundary = records
      .filter((record) => record.regionId === regionId && record.atMs < cutoffMs)
      .sort((a, b) => b.atMs - a.atMs || b.id.localeCompare(a.id))[0];
    if (boundary?.type === 'enter') retained.push(boundary);
  }
  return retained.sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id));
}
function parseAcceptance(value: string | null): GymVisitAcceptance | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Partial<GymVisitAcceptance>;
    if (!Number.isInteger(candidate.epoch) || !Array.isArray(candidate.regionIds)) return null;
    if (!candidate.regionIds.every((id) => typeof id === 'string')) return null;
    return { epoch: candidate.epoch!, regionIds: candidate.regionIds };
  } catch {
    return null;
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

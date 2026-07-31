import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GymVisit, GymVisitLog } from "./GymVisitLog";

export const GYM_VISIT_LOG_STORAGE_KEY =
  "@excerlock/location/confirmed-gym-visits/v1";

export class AsyncStorageGymVisitLog implements GymVisitLog {
  private writes: Promise<void> = Promise.resolve();

  public append(visit: GymVisit): Promise<void> {
    const coordinateFreeVisit: GymVisit = {
      regionId: visit.regionId,
      atMs: visit.atMs,
    };
    const write = this.writes.then(async () => {
      const visits = await readStoredVisits();
      await AsyncStorage.setItem(
        GYM_VISIT_LOG_STORAGE_KEY,
        JSON.stringify([...visits, coordinateFreeVisit]),
      );
    });
    this.writes = write.catch(() => undefined);
    return write;
  }

  public async readAll(): Promise<readonly GymVisit[]> {
    await this.writes;
    return readStoredVisits();
  }
}

async function readStoredVisits(): Promise<readonly GymVisit[]> {
  const stored = await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY);
  if (stored === null) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter(isGymVisit) : [];
  } catch {
    return [];
  }
}

function isGymVisit(value: unknown): value is GymVisit {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<GymVisit>;
  return (
    typeof candidate.regionId === "string" &&
    typeof candidate.atMs === "number" &&
    Number.isFinite(candidate.atMs)
  );
}

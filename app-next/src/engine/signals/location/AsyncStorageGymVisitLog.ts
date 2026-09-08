import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GymVisitInterval, GymVisitLog } from "./GymVisitLog";

// v2 stores intervals; v1 stored arrival instants and is not read.
export const GYM_VISIT_LOG_STORAGE_KEY =
  "@excerlock/location/confirmed-gym-visits/v2";

export class AsyncStorageGymVisitLog implements GymVisitLog {
  private writes: Promise<void> = Promise.resolve();

  public open(regionId: string, atMs: number): Promise<void> {
    return this.mutate((visits) =>
      openVisitIndex(visits, regionId) === -1
        ? [...visits, { regionId, enteredAt: atMs, exitedAt: null }]
        : visits,
    );
  }

  public close(regionId: string, atMs: number): Promise<void> {
    return this.mutate((visits) => {
      const index = openVisitIndex(visits, regionId);
      if (index === -1) {
        return visits;
      }
      const visit = visits[index];
      return visits.with(index, {
        ...visit,
        // A clock that moved backwards must not produce a negative stay.
        exitedAt: Math.max(atMs, visit.enteredAt),
      });
    });
  }

  public async readAll(): Promise<readonly GymVisitInterval[]> {
    await this.writes;
    return readStoredVisits();
  }

  /** Serialised so two geofence callbacks cannot lose each other's write. */
  private mutate(
    apply: (visits: readonly GymVisitInterval[]) => readonly GymVisitInterval[],
  ): Promise<void> {
    const write = this.writes.then(async () => {
      const visits = await readStoredVisits();
      const next = apply(visits);
      if (next === visits) {
        return;
      }
      await AsyncStorage.setItem(
        GYM_VISIT_LOG_STORAGE_KEY,
        JSON.stringify(next),
      );
    });
    this.writes = write.catch(() => undefined);
    return write;
  }
}

function openVisitIndex(
  visits: readonly GymVisitInterval[],
  regionId: string,
): number {
  return visits.findIndex(
    (visit) => visit.regionId === regionId && visit.exitedAt === null,
  );
}

async function readStoredVisits(): Promise<readonly GymVisitInterval[]> {
  const stored = await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY);
  if (stored === null) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter(isGymVisitInterval) : [];
  } catch {
    return [];
  }
}

function isGymVisitInterval(value: unknown): value is GymVisitInterval {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<GymVisitInterval>;
  return (
    typeof candidate.regionId === "string" &&
    typeof candidate.enteredAt === "number" &&
    Number.isFinite(candidate.enteredAt) &&
    (candidate.exitedAt === null ||
      (typeof candidate.exitedAt === "number" &&
        Number.isFinite(candidate.exitedAt)))
  );
}

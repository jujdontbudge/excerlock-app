import type { ConfiguredCondition } from "@excerlock/condition-model";

import {
  getLocationProvider,
  type AppLocationProvider,
} from "@/signals";

import { localWallClockNow } from "../model/clock";
import type { SavedPlace } from "../store/homeState";
import { useHomeStore } from "../store/homeStore";

type GymPresenceState = Readonly<{
  conditions: readonly ConfiguredCondition[];
  disabledConditionIds: readonly string[];
  savedPlaces: readonly SavedPlace[];
}>;

export interface GymPresenceControllerDependencies {
  readonly getState: () => GymPresenceState;
  readonly getLocation: () => Pick<AppLocationProvider, "checkIn">;
  readonly now: () => number;
  readonly recordEventPayout: (conditionId: string, atMs: number) => void;
}

/** Foreground owner of the default, When-In-Use gym check-in tier. */
export class GymPresenceController {
  public constructor(
    private readonly dependencies: GymPresenceControllerDependencies,
  ) {}

  public async checkIn(conditionId: string): Promise<boolean> {
    const state = this.dependencies.getState();
    const condition = state.conditions.find(
      ({ id }) => id === conditionId,
    );
    if (
      condition?.catalogId !== "gym-arrival" ||
      state.disabledConditionIds.includes(conditionId)
    ) {
      return false;
    }

    const place = state.savedPlaces.find(
      ({ id }) => id === condition.placeId,
    );
    if (place?.geofence === undefined) {
      return false;
    }

    const confirmed = await this.dependencies.getLocation().checkIn({
      id: place.id,
      ...place.geofence,
    });
    if (confirmed) {
      this.dependencies.recordEventPayout(
        conditionId,
        this.dependencies.now(),
      );
    }
    return confirmed;
  }
}

let sharedController: GymPresenceController | undefined;

/** The production controller stays lazy: empty-start never selects location. */
export function getGymPresenceController(): GymPresenceController {
  sharedController ??= new GymPresenceController({
    getState: () => useHomeStore.getState(),
    getLocation: () => getLocationProvider(),
    now: localWallClockNow,
    recordEventPayout: (conditionId, atMs) => {
      useHomeStore.getState().recordEventPayout(conditionId, atMs);
    },
  });
  return sharedController;
}

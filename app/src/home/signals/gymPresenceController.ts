import type { ConfiguredCondition } from "@excerlock/condition-model";

import {
  getLocationProvider,
  type AppLocationProvider,
} from "@/signals";

import { localWallClockNow } from "../model/clock";
import type { SavedPlace } from "../store/homeState";
import { useHomeStore } from "../store/homeStore";
import { useSettingsStore } from "@/settings/store/settingsStore";

type GymPresenceState = Readonly<{
  conditions: readonly ConfiguredCondition[];
  disabledConditionIds: readonly string[];
  savedPlaces: readonly SavedPlace[];
  autoDetectEnabled?: boolean;
}>;

type GymLocationProvider = Pick<
  AppLocationProvider,
  | "checkIn"
  | "getAuthorizationStatus"
  | "startMonitoringRegions"
  | "stopMonitoringRegions"
>;

export interface GymPresenceControllerDependencies {
  readonly getState: () => GymPresenceState;
  readonly getLocation: () => GymLocationProvider;
  readonly now: () => number;
  readonly recordEventPayout: (conditionId: string, atMs: number) => void;
  readonly setAutoDetectEnabled?: (enabled: boolean) => void;
}

/** Foreground owner of the default, When-In-Use gym check-in tier. */
export class GymPresenceController {
  private monitoring = false;

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

  /** The only path allowed to request Always permission. */
  public async enableAutoDetect(): Promise<boolean> {
    const regions = this.activeGymRegions();
    if (regions.length === 0) {
      return false;
    }

    await this.dependencies.getLocation().startMonitoringRegions(regions);
    this.monitoring = true;
    this.dependencies.setAutoDetectEnabled?.(true);
    return true;
  }

  /**
   * Restores an earlier opt-in without prompting. A missing Always grant is a
   * quiet no-op; only enableAutoDetect() may cross the permission boundary.
   */
  public async reconcileAutoDetect(): Promise<void> {
    const state = this.dependencies.getState();
    if (state.autoDetectEnabled !== true) {
      if (this.monitoring) {
        await this.dependencies.getLocation().stopMonitoringRegions();
        this.monitoring = false;
      }
      return;
    }

    const regions = this.activeGymRegions(state);
    if (regions.length === 0) {
      if (this.monitoring) {
        await this.dependencies.getLocation().stopMonitoringRegions();
        this.monitoring = false;
      }
      return;
    }

    const location = this.dependencies.getLocation();
    if (location.getAuthorizationStatus() !== "authorizedAlways") {
      return;
    }
    await location.startMonitoringRegions(regions);
    this.monitoring = true;
  }

  private activeGymRegions(
    state: GymPresenceState = this.dependencies.getState(),
  ) {
    const enabledPlaceIds = new Set(
      state.conditions
        .filter(
          ({ id, placeId, source }) =>
            source === "location" &&
            placeId !== undefined &&
            !state.disabledConditionIds.includes(id),
        )
        .map(({ placeId }) => placeId!),
    );

    return state.savedPlaces.flatMap((place) =>
      enabledPlaceIds.has(place.id) && place.geofence !== undefined
        ? [{ id: place.id, ...place.geofence }]
        : [],
    );
  }
}

let sharedController: GymPresenceController | undefined;

/** The production controller stays lazy: empty-start never selects location. */
export function getGymPresenceController(): GymPresenceController {
  sharedController ??= new GymPresenceController({
    getState: () => ({
      ...useHomeStore.getState(),
      autoDetectEnabled: useSettingsStore.getState().gymAutoDetectEnabled,
    }),
    getLocation: () => getLocationProvider(),
    now: localWallClockNow,
    recordEventPayout: (conditionId, atMs) => {
      useHomeStore.getState().recordEventPayout(conditionId, atMs);
    },
    setAutoDetectEnabled: (enabled) => {
      useSettingsStore.getState().setGymAutoDetectEnabled(enabled);
    },
  });
  return sharedController;
}

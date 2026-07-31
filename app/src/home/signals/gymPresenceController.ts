import type { ConfiguredCondition } from "@excerlock/condition-model";

import {
  AsyncStorageGymVisitLog,
  getLocationProvider,
  type AppLocationProvider,
  type GymVisit,
} from "@/signals";

import { localWallClockNow } from "../model/clock";
import type { SavedPlace } from "../store/homeState";
import { useHomeStore } from "../store/homeStore";
import { useSettingsStore } from "@/settings";

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
  | "on"
  | "startMonitoringRegions"
  | "stopMonitoringRegions"
>;

export interface GymPresenceControllerDependencies {
  readonly getConfirmedVisits?: () => Promise<readonly GymVisit[]>;
  readonly getState: () => GymPresenceState;
  readonly getLocation: () => GymLocationProvider;
  readonly now: () => number;
  readonly recordEventPayout: (conditionId: string, atMs: number) => void;
  readonly setAutoDetectEnabled?: (enabled: boolean) => void;
  readonly toLedgerTime?: (atMs: number) => number;
}

/** Foreground owner of the default, When-In-Use gym check-in tier. */
export class GymPresenceController {
  private monitoring = false;
  private unsubscribeRegion: (() => void) | undefined;

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

    const location = this.dependencies.getLocation();
    this.subscribeToRegions(location);
    await location.startMonitoringRegions(regions);
    this.monitoring = true;
    this.dependencies.setAutoDetectEnabled?.(true);
    return true;
  }

  /** Explicit opt-out; leaves the complete manual check-in tier available. */
  public async disableAutoDetect(): Promise<void> {
    this.dependencies.setAutoDetectEnabled?.(false);
    if (this.monitoring) {
      await this.dependencies.getLocation().stopMonitoringRegions();
      this.monitoring = false;
    }
    this.unsubscribeRegion?.();
    this.unsubscribeRegion = undefined;
  }

  /**
   * Restores an earlier opt-in without prompting. A missing Always grant is a
   * quiet no-op; only enableAutoDetect() may cross the permission boundary.
   */
  public async reconcileAutoDetect(): Promise<void> {
    const state = this.dependencies.getState();
    await this.claimConfirmedVisits(state);
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
    this.subscribeToRegions(location);
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

  private subscribeToRegions(location: GymLocationProvider): void {
    this.unsubscribeRegion ??= location.on("region", (transition) => {
      if (transition.type !== "enter") {
        return;
      }
      this.recordArrival(
        this.dependencies.getState(),
        transition.regionId,
        transition.atMs,
      );
    });
  }

  private async claimConfirmedVisits(state: GymPresenceState): Promise<void> {
    if (
      this.dependencies.getConfirmedVisits === undefined ||
      !state.conditions.some(
        ({ catalogId, id }) =>
          catalogId === "gym-arrival" &&
          !state.disabledConditionIds.includes(id),
      )
    ) {
      return;
    }
    const visits = await this.dependencies.getConfirmedVisits();
    visits.forEach(({ regionId, atMs }) => {
      this.recordArrival(state, regionId, atMs);
    });
  }

  private recordArrival(
    state: GymPresenceState,
    regionId: string,
    atMs: number,
  ): void {
    state.conditions
      .filter(
        ({ catalogId, id, placeId }) =>
          catalogId === "gym-arrival" &&
          placeId === regionId &&
          !state.disabledConditionIds.includes(id),
      )
      .forEach(({ id }) => {
        this.dependencies.recordEventPayout(
          id,
          this.dependencies.toLedgerTime?.(atMs) ?? atMs,
        );
      });
  }
}

let sharedController: GymPresenceController | undefined;
const confirmedVisitLog = new AsyncStorageGymVisitLog();

/** The production controller stays lazy: empty-start never selects location. */
export function getGymPresenceController(): GymPresenceController {
  sharedController ??= new GymPresenceController({
    getConfirmedVisits: () => confirmedVisitLog.readAll(),
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
    toLedgerTime: localWallClockNow,
  });
  return sharedController;
}

/** Installs fixture composition before E2E app surfaces mount. */
export function installGymPresenceController(
  controller: GymPresenceController,
): () => void {
  const previous = sharedController;
  sharedController = controller;
  return () => {
    if (sharedController === controller) {
      sharedController = previous;
    }
  };
}

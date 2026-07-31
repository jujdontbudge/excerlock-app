import type { DesiredOsState } from "@excerlock/ledger";

import type {
  LockWindow,
  ScreenTimeSelectionHandle,
} from "../ScreenTimeModule";
import type { DeviceActivityApi } from "./deviceActivityTypes";
import {
  BALANCE_DRAIN_MONITOR,
  balanceRungEventName,
  localDateComponents,
  localDaySchedule,
  monitorNameForLockWindow,
  UNLOCK_INCREMENT_MS,
  UNLOCK_LEASE_MONITOR,
  usageThresholdComponents,
} from "./deviceActivitySchedule";
import type { NativeScheduledLockWindow } from "./nativeStore";

export type NativeShieldResult = Readonly<{
  effectiveShields: DesiredOsState["shields"];
  activeLockWindowId: string | null;
}>;

type CancelResult = Readonly<{
  selection: ScreenTimeSelectionHandle;
  shield: NativeShieldResult;
}>;

/** Owns all DeviceActivity schedules and ManagedSettings shield transitions. */
export class NativeShieldScheduler {
  private lockWindows: NativeScheduledLockWindow[] = [];

  public constructor(
    private readonly deviceActivity: DeviceActivityApi,
    private readonly nowMs: () => number,
  ) {}

  public restore(lockWindows: readonly NativeScheduledLockWindow[]): void {
    this.lockWindows = [...lockWindows];
  }

  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    desired: DesiredOsState,
  ): Promise<NativeShieldResult> {
    this.lockWindows.forEach((window) => {
      this.configureLockWindowStart(window, desired.shields);
    });
    return this.apply(selection, desired);
  }

  public async schedule(
    selection: ScreenTimeSelectionHandle,
    window: LockWindow,
    desired: DesiredOsState,
  ): Promise<NativeShieldResult | null> {
    const existing = this.lockWindows.find(({ id }) => id === window.id);
    if (
      existing?.selection === selection &&
      existing.startsAtMs === window.startsAtMs &&
      existing.endsAtMs === window.endsAtMs
    ) {
      return null;
    }
    const scheduled: NativeScheduledLockWindow = Object.freeze({
      ...window,
      selection,
    });
    this.configureLockWindowStart(scheduled, desired.shields);
    this.deviceActivity.configureActions({
      activityName: monitorNameForLockWindow(window.id),
      callbackName: "intervalDidEnd",
      actions: [
        {
          type: "unblockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    await this.deviceActivity.startMonitoring(
      monitorNameForLockWindow(window.id),
      {
        intervalStart: localDateComponents(window.startsAtMs),
        intervalEnd: localDateComponents(window.endsAtMs),
        repeats: false,
      },
      [],
    );
    this.lockWindows = [
      ...this.lockWindows.filter(({ id }) => id !== window.id),
      scheduled,
    ].sort((left, right) => left.startsAtMs - right.startsAtMs);
    return this.apply(selection, desired);
  }

  public async cancel(
    id: string,
    desired: DesiredOsState,
  ): Promise<CancelResult | null> {
    const existing = this.lockWindows.find((window) => window.id === id);
    if (existing === undefined) {
      return null;
    }
    this.deviceActivity.stopMonitoring([monitorNameForLockWindow(id)]);
    this.lockWindows = this.lockWindows.filter((window) => window.id !== id);
    return {
      selection: existing.selection,
      shield: await this.apply(existing.selection, desired),
    };
  }

  public publicLockWindows(): readonly LockWindow[] {
    return this.lockWindows.map(({ id, startsAtMs, endsAtMs }) =>
      Object.freeze({ id, startsAtMs, endsAtMs }),
    );
  }

  public persistedLockWindows(): readonly NativeScheduledLockWindow[] {
    return this.lockWindows;
  }

  public observe(): NativeShieldResult {
    return {
      effectiveShields: this.deviceActivity.isShieldActive() ? "up" : "down",
      activeLockWindowId: this.activeWindow()?.id ?? null,
    };
  }

  private async apply(
    selection: ScreenTimeSelectionHandle,
    desired: DesiredOsState,
  ): Promise<NativeShieldResult> {
    const activeWindow = this.activeWindow();
    const economyIsActive =
      this.lockWindows.length === 0 || activeWindow !== undefined;
    const effectiveShields = economyIsActive ? desired.shields : "down";
    const needsUnlockLease =
      economyIsActive &&
      effectiveShields === "down" &&
      desired.drainThresholds.length === 0;

    if (effectiveShields === "up") {
      this.stopRuntimeMonitors();
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
    } else {
      if (desired.drainThresholds.length > 0 && economyIsActive) {
        this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
        await this.armBalanceDrain(selection, desired.drainThresholds);
      } else if (needsUnlockLease) {
        this.deviceActivity.stopMonitoring([BALANCE_DRAIN_MONITOR]);
        await this.armUnlockLease(selection);
      } else {
        this.stopRuntimeMonitors();
      }
      this.deviceActivity.unblockSelection({ activitySelectionId: selection });
    }

    return {
      effectiveShields,
      activeLockWindowId: activeWindow?.id ?? null,
    };
  }

  private async armUnlockLease(
    selection: ScreenTimeSelectionHandle,
  ): Promise<void> {
    const startsAtMs = this.nowMs();
    this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
    this.deviceActivity.configureActions({
      activityName: UNLOCK_LEASE_MONITOR,
      callbackName: "intervalDidEnd",
      actions: [
        {
          type: "blockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    try {
      await this.deviceActivity.startMonitoring(
        UNLOCK_LEASE_MONITOR,
        {
          intervalStart: localDateComponents(startsAtMs),
          intervalEnd: localDateComponents(startsAtMs + UNLOCK_INCREMENT_MS),
          repeats: false,
        },
        [],
      );
    } catch (error) {
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
      throw error;
    }
  }

  private async armBalanceDrain(
    selection: ScreenTimeSelectionHandle,
    thresholds: DesiredOsState["drainThresholds"],
  ): Promise<void> {
    this.deviceActivity.stopMonitoring([BALANCE_DRAIN_MONITOR]);
    const events = thresholds.map((threshold, index) => ({
      familyActivitySelection: selection,
      threshold: usageThresholdComponents(threshold),
      eventName: balanceRungEventName(index),
      includesPastActivity: true,
    }));
    const finalEvent = events.at(-1);
    if (finalEvent === undefined) {
      return;
    }
    this.deviceActivity.configureActions({
      activityName: BALANCE_DRAIN_MONITOR,
      callbackName: "eventDidReachThreshold",
      eventName: finalEvent.eventName,
      actions: [
        {
          type: "blockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    try {
      await this.deviceActivity.startMonitoring(
        BALANCE_DRAIN_MONITOR,
        localDaySchedule(this.nowMs()),
        events,
      );
    } catch (error) {
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
      throw error;
    }
  }

  private configureLockWindowStart(
    window: NativeScheduledLockWindow,
    desiredShields: DesiredOsState["shields"],
  ): void {
    this.deviceActivity.configureActions({
      activityName: monitorNameForLockWindow(window.id),
      callbackName: "intervalDidStart",
      actions: [
        {
          type:
            desiredShields === "up" ? "blockSelection" : "unblockSelection",
          familyActivitySelectionId: window.selection,
        },
      ],
    });
  }

  private activeWindow(): NativeScheduledLockWindow | undefined {
    const nowMs = this.nowMs();
    return this.lockWindows.find(
      ({ startsAtMs, endsAtMs }) =>
        nowMs >= startsAtMs && nowMs < endsAtMs,
    );
  }

  private stopRuntimeMonitors(): void {
    this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
    this.deviceActivity.stopMonitoring([BALANCE_DRAIN_MONITOR]);
  }
}

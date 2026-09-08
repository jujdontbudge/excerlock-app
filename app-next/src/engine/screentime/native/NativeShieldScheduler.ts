import type { MonitorPlan } from "../../../domain/monitorPlan";
import type {
  ScheduledMonitor,
  ScreenTimeSelectionHandle,
  ShieldIntent,
} from "../ScreenTimeModule";
import type { DeviceActivityApi } from "./deviceActivityTypes";
import {
  localDateComponents,
  UNLOCK_INCREMENT_MS,
  UNLOCK_LEASE_MONITOR,
} from "./deviceActivitySchedule";
import type { NativeScheduledMonitor } from "./nativeStore";

export type NativeShieldResult = Readonly<{
  effectiveShields: ShieldIntent;
  activeMonitorName: string | null;
}>;

/**
 * Owns every DeviceActivity schedule and ManagedSettings shield transition.
 *
 * It takes a `MonitorPlan` — the merged, absolute, budgeted lock intervals of
 * `compileMonitorPlan` — rather than the ledger's `DesiredOsState`, so monitor
 * count no longer tracks rule count and an `intervalDidEnd` can only ever mean
 * "no rule is active". The met-today fact, the earned unlock, the walking lease
 * and a lapsed subscription are not read by the extension: there is no OS-side
 * arithmetic. They are expressed by reconfiguring each monitor's action list on
 * every run, which is safe because every one of those facts can only be
 * recorded while the app is running.
 */
export class NativeShieldScheduler {
  private monitors: NativeScheduledMonitor[] = [];

  public constructor(
    private readonly deviceActivity: DeviceActivityApi,
    private readonly nowMs: () => number,
  ) {}

  public restore(monitors: readonly NativeScheduledMonitor[]): void {
    this.monitors = [...monitors];
  }

  /**
   * The single re-arm routine. Registers exactly the plan's monitors, retires
   * the ones it drops, and applies `shields`.
   *
   * Fail-closed ordering is preserved from the shipped scheduler: a monitor
   * that will not register raises the shield before the error escapes, so a
   * failed registration can never leave the apps open.
   */
  public async reconcile(
    selection: ScreenTimeSelectionHandle,
    shields: ShieldIntent,
    plan: MonitorPlan,
    startIntents: Readonly<Record<string, ShieldIntent>> = {},
  ): Promise<NativeShieldResult> {
    const target = plan.monitors.map(
      (monitor): NativeScheduledMonitor => ({
        name: monitor.name,
        startsAtMs: Date.parse(monitor.start),
        endsAtMs: Date.parse(monitor.end),
        selection,
      }),
    );
    const retired = this.monitors.filter(
      (existing) =>
        !target.some(
          (next) =>
            next.name === existing.name && next.selection === existing.selection,
        ),
    );
    if (retired.length > 0) {
      this.deviceActivity.stopMonitoring(retired.map(({ name }) => name));
    }

    // Reconfigure first, so a monitor that fires between here and the last
    // startMonitoring call already carries this run's intent.
    target.forEach((monitor) => {
      // A window the caller says is already earned open starts open; every other
      // window starts on the run's intent. This is the whole met-today mechanism.
      this.configureLockWindowStart(monitor, startIntents[monitor.name] ?? shields);
      this.deviceActivity.configureActions({
        activityName: monitor.name,
        callbackName: "intervalDidEnd",
        actions: [
          {
            type: "unblockSelection",
            familyActivitySelectionId: monitor.selection,
          },
        ],
      });
    });

    this.monitors = [...target].sort(
      (left, right) => left.startsAtMs - right.startsAtMs,
    );

    for (const monitor of this.monitors) {
      try {
        await this.deviceActivity.startMonitoring(
          monitor.name,
          {
            intervalStart: localDateComponents(monitor.startsAtMs),
            intervalEnd: localDateComponents(monitor.endsAtMs),
            repeats: false,
          },
          [],
        );
      } catch (error) {
        this.deviceActivity.blockSelection({ activitySelectionId: selection });
        throw error;
      }
    }

    return this.apply(selection, shields);
  }

  /**
   * The walking lease: one renewable interval that re-shields when it lapses,
   * so a force-quit mid-session costs at most one increment. `untilMs` is the
   * session machine's `leaseUntil`; there is no renew, only a later reconcile
   * with a later deadline.
   */
  public async armUnlockLease(
    selection: ScreenTimeSelectionHandle,
    untilMs: number,
  ): Promise<void> {
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
          // DeviceActivity refuses an interval shorter than one increment, and a
          // renewal arrives mid-flight, so the start is backdated to keep the
          // interval whole. This is the only place a backdated start survives:
          // B32's 30-minute minimum window removed the need for it elsewhere.
          intervalStart: localDateComponents(
            Math.min(this.nowMs(), untilMs - UNLOCK_INCREMENT_MS),
          ),
          intervalEnd: localDateComponents(untilMs),
          repeats: false,
        },
        [],
      );
    } catch (error) {
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
      throw error;
    }
  }

  public stopUnlockLease(): void {
    this.deviceActivity.stopMonitoring([UNLOCK_LEASE_MONITOR]);
  }

  public publicMonitors(): readonly ScheduledMonitor[] {
    return this.monitors.map(({ name, startsAtMs, endsAtMs }) =>
      Object.freeze({ name, startsAtMs, endsAtMs }),
    );
  }

  public persistedMonitors(): readonly NativeScheduledMonitor[] {
    return this.monitors;
  }

  public observe(): NativeShieldResult {
    return {
      effectiveShields: this.deviceActivity.isShieldActive() ? "up" : "down",
      activeMonitorName: this.activeMonitor()?.name ?? null,
    };
  }

  private apply(
    selection: ScreenTimeSelectionHandle,
    shields: ShieldIntent,
  ): NativeShieldResult {
    const activeMonitor = this.activeMonitor();
    // With no windows at all the intent applies directly; with windows, only an
    // interval containing now can hold shields up.
    const insideAWindow =
      this.monitors.length === 0 || activeMonitor !== undefined;
    const effectiveShields = insideAWindow ? shields : "down";

    if (effectiveShields === "up") {
      this.stopUnlockLease();
      this.deviceActivity.blockSelection({ activitySelectionId: selection });
    } else {
      this.deviceActivity.unblockSelection({ activitySelectionId: selection });
    }

    return {
      effectiveShields,
      activeMonitorName: activeMonitor?.name ?? null,
    };
  }

  private configureLockWindowStart(
    monitor: NativeScheduledMonitor,
    shields: ShieldIntent,
  ): void {
    this.deviceActivity.configureActions({
      activityName: monitor.name,
      callbackName: "intervalDidStart",
      actions: [
        {
          type: shields === "up" ? "blockSelection" : "unblockSelection",
          familyActivitySelectionId: monitor.selection,
        },
      ],
    });
  }

  private activeMonitor(): NativeScheduledMonitor | undefined {
    const nowMs = this.nowMs();
    return this.monitors.find(
      ({ startsAtMs, endsAtMs }) => nowMs >= startsAtMs && nowMs < endsAtMs,
    );
  }
}

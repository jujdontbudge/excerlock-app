import type {
  CurrentShieldState,
  ScheduledMonitor,
  ScreenTimeSelectionHandle,
  ShieldIntent,
} from "./ScreenTimeModule";

export const DEFAULT_SHIELD_STATE: CurrentShieldState = Object.freeze({
  selection: null,
  desiredShields: "down",
  effectiveShields: "down",
  activeMonitorName: null,
});

/**
 * With no monitors registered the intent applies directly. With monitors, only
 * an interval containing `nowMs` can hold shields up: an interval that has
 * ended can only mean no rule is active, because the plan merges overlapping
 * and adjacent windows into one.
 */
export function deriveShieldState(
  selection: ScreenTimeSelectionHandle | null,
  desiredShields: ShieldIntent,
  monitors: readonly ScheduledMonitor[],
  nowMs: number,
): CurrentShieldState {
  const activeMonitor = monitors.find(
    (monitor) => nowMs >= monitor.startsAtMs && nowMs < monitor.endsAtMs,
  );

  return Object.freeze({
    selection,
    desiredShields,
    effectiveShields:
      monitors.length === 0 || activeMonitor ? desiredShields : "down",
    activeMonitorName: activeMonitor?.name ?? null,
  });
}

export function shieldStatesEqual(
  left: CurrentShieldState,
  right: CurrentShieldState,
): boolean {
  return (
    left.selection === right.selection &&
    left.desiredShields === right.desiredShields &&
    left.effectiveShields === right.effectiveShields &&
    left.activeMonitorName === right.activeMonitorName
  );
}

import type { DesiredOsState } from "@excerlock/ledger";

import type {
  CurrentShieldState,
  ScreenTimeSelectionHandle,
} from "./ScreenTimeModule";
import type { ScheduledLockWindow } from "./mockStore";

export const DEFAULT_SHIELD_STATE: CurrentShieldState = Object.freeze({
  selection: null,
  desiredOsState: freezeDesiredOsState({
    shields: "down",
    drainThresholds: [],
  }),
  effectiveShields: "down",
  activeLockWindowId: null,
});

export function freezeDesiredOsState(state: DesiredOsState): DesiredOsState {
  const drainThresholds = Object.freeze([
    ...state.drainThresholds,
  ]) as unknown as DesiredOsState["drainThresholds"];
  return Object.freeze({ shields: state.shields, drainThresholds });
}

export function deriveShieldState(
  selection: ScreenTimeSelectionHandle | null,
  desiredOsState: DesiredOsState,
  lockWindows: readonly ScheduledLockWindow[],
  nowMs: number,
): CurrentShieldState {
  const selectionWindows = lockWindows.filter(
    (window) => window.selection === selection,
  );
  const activeWindow = selectionWindows.find(
    (window) => nowMs >= window.startsAtMs && nowMs < window.endsAtMs,
  );

  return Object.freeze({
    selection,
    desiredOsState: freezeDesiredOsState(desiredOsState),
    effectiveShields:
      selectionWindows.length === 0 || activeWindow
        ? desiredOsState.shields
        : "down",
    activeLockWindowId: activeWindow?.id ?? null,
  });
}

export function shieldStatesEqual(
  left: CurrentShieldState,
  right: CurrentShieldState,
): boolean {
  return (
    left.selection === right.selection &&
    left.effectiveShields === right.effectiveShields &&
    left.activeLockWindowId === right.activeLockWindowId &&
    desiredOsStatesEqual(left.desiredOsState, right.desiredOsState)
  );
}

export function desiredOsStatesEqual(
  left: DesiredOsState,
  right: DesiredOsState,
): boolean {
  return (
    left.shields === right.shields &&
    left.drainThresholds.length === right.drainThresholds.length &&
    left.drainThresholds.every(
      (threshold, index) => threshold === right.drainThresholds[index],
    )
  );
}

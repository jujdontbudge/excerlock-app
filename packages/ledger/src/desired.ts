import { planDrainLadder } from './ladder'
import { reduceLedger } from './reduce'
import type { Journal, LedgerConfig, Minutes } from './types'
import { isWalkWindowActive, type WalkWindow } from './walk'

/** The OS state ShieldController must reconcile against (ARCHITECTURE §2). */
export interface DesiredOsState {
  shields: 'up' | 'down'
  /** Absolute cumulative-usage thresholds (minutes) for the 1-min drain ladder. */
  drainThresholds: Minutes[]
}

/**
 * Compute the desired shield state at `atMs`. Shields are down when any of:
 * balance remains (or is unlimited), a shield holiday is running, or an active
 * Walk & Scroll window holds them open (walking beats everything, Full Lock
 * included). The ladder is disarmed during holidays (usage then is free) and
 * whenever there is nothing left to drain — a walk session at zero balance
 * grants access, never credit.
 */
export function desiredOsState(
  journal: Journal,
  config: LedgerConfig,
  atMs: number,
  walkWindow?: WalkWindow | null,
): DesiredOsState {
  const days = reduceLedger(journal, config, atMs)
  const today = days[days.length - 1]!
  const holidayActive = today.holidays.some((h) => atMs >= h.startMs && atMs < h.endMs)
  const walkActive = isWalkWindowActive(walkWindow, atMs)

  const shields = walkActive || holidayActive || today.balance > 0 ? 'down' : 'up'
  const drainThresholds = holidayActive
    ? []
    : planDrainLadder({ usedMinutes: today.usageMinutes, remainingMinutes: today.balance })
  return { shields, drainThresholds }
}

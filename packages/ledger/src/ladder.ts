import type { Minutes } from './types'

export interface LadderPlan {
  /** Cumulative locked-group usage already counted today (the OS's number when available). */
  usedMinutes: Minutes
  /** Balance left to drain. 0 / unlimited / negative ⇒ nothing to arm. */
  remainingMinutes: Minutes
  /** Optional cap on armed rungs (OS threshold limits); ShieldController re-arms as rungs fire. */
  maxRungs?: number
}

/**
 * The 1-minute drain ladder (#16 M3/M5): cumulative-usage thresholds to arm so
 * each fired event drains one minute. Thresholds are absolute usage minutes —
 * re-arming with `includesPastActivity: true` after any balance change is just
 * calling this again with the current usage count. The final rung lands exactly
 * where the balance reaches zero (fractional when the balance is fractional).
 */
export function planDrainLadder({ usedMinutes, remainingMinutes, maxRungs }: LadderPlan): Minutes[] {
  if (!Number.isFinite(remainingMinutes) || remainingMinutes <= 0) return []
  const rungs: Minutes[] = []
  for (let step = 1; step <= Math.floor(remainingMinutes); step++) {
    rungs.push(usedMinutes + step)
  }
  if (remainingMinutes % 1 !== 0) rungs.push(usedMinutes + remainingMinutes)
  return maxRungs !== undefined ? rungs.slice(0, maxRungs) : rungs
}

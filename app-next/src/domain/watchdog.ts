import type { Entitlement, LockDecision } from './types';

export const WATCHDOG_MS = 15 * 60_000;
export const WATCHDOG_RENEW_MS = 5 * 60_000;
export const MAX_DEVICE_ACTIVITY_MONITORS = 20;
export type WatchdogContext = {
  /** Changes on any effective rule/window/earned-suppression policy change. */
  policyGeneration: number;
  accountGeneration: number;
  /** Opaque selection VERSION, not app IDs or a serialized selection token. */
  selectionVersion: string;
};
export type WatchdogRegistration = WatchdogContext & {
  start: number;
  end: number;
  registeredAt: number;
  eligibleUntil: number;
};
export type WatchdogInput = {
  now: number;
  decision: LockDecision['state'] | 'unlockedPropped';
  entitlement: Entitlement['status'];
  canEnforce: boolean;
  deleting: boolean;
  context: WatchdogContext;
  /** Last instant of current active window; native callback must also check it. */
  eligibleUntil: number;
  /** Last SUCCESSFULLY registered protection, not the last attempted plan. */
  previous: WatchdogRegistration | null;
  /** Foreground/background wake: OS monitor retention must not be assumed. */
  force?: boolean;
};
export type WatchdogPlan = { register: WatchdogRegistration | null; cancel: boolean };
const idle = (): WatchdogPlan => ({ register: null, cancel: false });
const cancel = (): WatchdogPlan => ({ register: null, cancel: true });

function sameContext(a: WatchdogContext, b: WatchdogContext): boolean {
  return a.policyGeneration === b.policyGeneration && a.accountGeneration === b.accountGeneration &&
    a.selectionVersion === b.selectionVersion;
}
function validateContext(context: WatchdogContext): void {
  if (![context.policyGeneration, context.accountGeneration].every((value) => Number.isSafeInteger(value) && value >= 0) || !context.selectionVersion) {
    throw new Error('Invalid watchdog context');
  }
}
function validateTime(value: number): void {
  if (!Number.isFinite(value) || !Number.isFinite(new Date(value).getTime())) throw new Error('Invalid watchdog timestamp');
}

/**
 * Pure intent only: host must atomically publish native eligibility/generation,
 * arm BEFORE unshielding, retain old monitor while staging a renewal and report
 * transport failure. `cancel:false` with a registration NEVER means cancel old
 * protection first. Callbacks must recheck native account/selection/window and
 * earned suppression before writing shields. Unit tests cannot prove OS timing.
 */
export function planWatchdog(input: WatchdogInput): WatchdogPlan {
  validateTime(input.now);
  validateTime(input.eligibleUntil);
  // Explicit cleanup must not depend on stale protection/context validity.
  if (!input.canEnforce || input.deleting || input.eligibleUntil <= input.now ||
    ['none', 'expired', 'billingIssue'].includes(input.entitlement) ||
    !['unlockedWalking', 'unlockedPropped', 'unlockedAtGym'].includes(input.decision)) return cancel();
  validateContext(input.context);
  const previous = input.previous;
  if (previous) {
    validateContext(previous);
    for (const time of [previous.start, previous.end, previous.registeredAt, previous.eligibleUntil]) validateTime(time);
    if (input.now < previous.registeredAt) throw new Error('Watchdog clock rewind requires watermark reconciliation');
    if (previous.end <= previous.start || previous.end - previous.start < WATCHDOG_MS || previous.end > previous.eligibleUntil) {
      throw new Error('Invalid persisted watchdog registration');
    }
  }

  if (input.entitlement === 'unknown') {
    // No new relief and no indefinite renewal from vendor silence. Existing
    // matching-context protection may reach its original bounded deadline.
    return previous && !sameContext(previous, input.context) ? cancel() : idle();
  }
  if (previous && !input.force && sameContext(previous, input.context) &&
    previous.eligibleUntil === input.eligibleUntil && previous.end > input.now &&
    input.now - previous.registeredAt < WATCHDOG_RENEW_MS) return idle();

  const end = Math.min(input.now + WATCHDOG_MS, input.eligibleUntil);
  const start = Math.min(input.now, end - WATCHDOG_MS);
  // Backdating satisfies the structural minimum. Platform acceptance/jitter is
  // an explicit hardware gate; the native transport must surface rejections.
  return { register: { ...input.context, start, end, registeredAt: input.now, eligibleUntil: input.eligibleUntil }, cancel: false };
}

/** Include staged/alternating watchdog IDs, not only the committed monitor. */
export function assertMonitorBudget(counts: readonly number[]): void {
  if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)) throw new Error('Invalid monitor count');
  if (counts.reduce((total, count) => total + count, 0) > MAX_DEVICE_ACTIVITY_MONITORS) {
    throw new Error('DeviceActivity monitor budget exceeds 20');
  }
}

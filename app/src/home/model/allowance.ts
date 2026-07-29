import { UNLIMITED } from "@excerlock/ledger";

import { formatMinutes } from "./duration";

/**
 * The daily base allowance — and with it, the whole of Full Lock.
 *
 * PRD §3.2 folds "lock my phone until I exercise" into a base allowance of zero
 * rather than a mode, so there is no Full Lock flag anywhere in the app: only
 * this number and what it replaced. Home's store is its **one owner**
 * (`store/homeStore.ts`); the lock surface reads it through
 * `lock/controller/ledgerSource.ts` and writes nothing of its own.
 */
export interface AllowanceValues {
  /** Minutes per day. `0` is Full Lock; `UNLIMITED` is "no limit set". */
  readonly baseAllowanceMinutes: number;
  /** What exit puts back. `null` is "nothing remembered" — restore unlimited. */
  readonly allowanceBeforeFullLock: number | null;
}

/** PRD §8: 0 (Full Lock) – 4 h in 5-min steps. `UNLIMITED` sits past the top. */
export const BASE_ALLOWANCE_RANGE = Object.freeze({ min: 0, max: 240, step: 5 });

export function isFullLock({ baseAllowanceMinutes }: AllowanceValues): boolean {
  return baseAllowanceMinutes === 0;
}

export function enterFullLock(values: AllowanceValues): AllowanceValues {
  return isFullLock(values)
    ? values
    : {
        baseAllowanceMinutes: 0,
        allowanceBeforeFullLock: Number.isFinite(values.baseAllowanceMinutes)
          ? values.baseAllowanceMinutes
          : null,
      };
}

export function exitFullLock(values: AllowanceValues): AllowanceValues {
  return isFullLock(values)
    ? {
        baseAllowanceMinutes: values.allowanceBeforeFullLock ?? UNLIMITED,
        allowanceBeforeFullLock: null,
      }
    : values;
}

/**
 * The picker's one verb. Choosing zero *is* entering Full Lock — same
 * transition, same memory — so Manage's picker and the lock surface's switch can
 * never disagree about what zero means.
 */
export function setBaseAllowance(
  values: AllowanceValues,
  minutes: number,
): AllowanceValues {
  return minutes === 0
    ? enterFullLock(values)
    : { baseAllowanceMinutes: minutes, allowanceBeforeFullLock: null };
}

/** One press of the picker, clamped to the grid, with Unlimited past the top. */
export function stepBaseAllowance(minutes: number, direction: 1 | -1): number {
  const { min, max, step } = BASE_ALLOWANCE_RANGE;

  if (!Number.isFinite(minutes)) {
    return direction === 1 ? UNLIMITED : max;
  }

  const next =
    direction === 1
      ? (Math.floor(minutes / step) + 1) * step
      : (Math.ceil(minutes / step) - 1) * step;
  return next > max ? UNLIMITED : Math.min(max, Math.max(min, next));
}

/** How the chosen value reads back to the user, at both ends of the grid. */
export function allowanceLabel(minutes: number): string {
  return minutes === 0 ? "Full Lock" : formatMinutes(minutes);
}

import { UNLIMITED, type LedgerConfig } from "@excerlock/ledger";

/**
 * The daily base allowance, which is the whole of Full Lock: PRD §3.2 folds
 * "lock my phone until I exercise" into a zero allowance rather than a mode, so
 * there is no separate code path here either — only a number and what it was.
 */
export interface AllowanceValues {
  /** Minutes per day. `0` is Full Lock; `null` is "unlimited until set". */
  readonly baseAllowanceMinutes: number | null;
  /** What to put back when Full Lock is turned off. */
  readonly allowanceBeforeFullLock: number | null;
}

export function isFullLock({ baseAllowanceMinutes }: AllowanceValues): boolean {
  return baseAllowanceMinutes === 0;
}

export function enterFullLock(values: AllowanceValues): AllowanceValues {
  return isFullLock(values)
    ? values
    : {
        baseAllowanceMinutes: 0,
        allowanceBeforeFullLock: values.baseAllowanceMinutes,
      };
}

export function exitFullLock(values: AllowanceValues): AllowanceValues {
  return isFullLock(values)
    ? {
        baseAllowanceMinutes: values.allowanceBeforeFullLock,
        allowanceBeforeFullLock: null,
      }
    : values;
}

/**
 * `UNLIMITED` is the ledger's word for an allowance the user has never set —
 * the one place `null` is translated, so nothing downstream sees two spellings.
 */
export function toLedgerConfig({
  baseAllowanceMinutes,
}: AllowanceValues): LedgerConfig {
  return {
    dayBoundaryOffsetMinutes: 0,
    baseAllowanceMinutes: baseAllowanceMinutes ?? UNLIMITED,
    rollover: null,
  };
}

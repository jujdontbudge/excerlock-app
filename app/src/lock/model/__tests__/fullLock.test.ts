import { UNLIMITED } from "@excerlock/ledger";

import {
  enterFullLock,
  exitFullLock,
  isFullLock,
  toLedgerConfig,
  type AllowanceValues,
} from "../fullLock";

const allowance = (
  baseAllowanceMinutes: number | null,
  allowanceBeforeFullLock: number | null = null,
): AllowanceValues => ({ baseAllowanceMinutes, allowanceBeforeFullLock });

describe("Full Lock", () => {
  it("is exactly a base allowance of zero (PRD §3.2 — no separate mode)", () => {
    expect(isFullLock(allowance(0))).toBe(true);
    expect(isFullLock(allowance(30))).toBe(false);
    expect(isFullLock(allowance(null))).toBe(false);
  });

  it("remembers the allowance it replaced so exit restores it", () => {
    const entered = enterFullLock(allowance(45));

    expect(entered).toEqual(allowance(0, 45));
    expect(exitFullLock(entered)).toEqual(allowance(45));
  });

  it("restores an unset allowance as unlimited, not as zero", () => {
    expect(exitFullLock(enterFullLock(allowance(null)))).toEqual(allowance(null));
  });

  it("never overwrites the remembered allowance by entering twice", () => {
    const once = enterFullLock(allowance(45));

    expect(enterFullLock(once)).toEqual(once);
  });

  it("leaves an already-open allowance alone on exit", () => {
    expect(exitFullLock(allowance(45))).toEqual(allowance(45));
  });

  it("hands the ledger an unset allowance as UNLIMITED, and Full Lock as zero", () => {
    expect(toLedgerConfig(allowance(null)).baseAllowanceMinutes).toBe(UNLIMITED);
    expect(toLedgerConfig(allowance(0)).baseAllowanceMinutes).toBe(0);
    expect(toLedgerConfig(allowance(30))).toEqual({
      dayBoundaryOffsetMinutes: 0,
      baseAllowanceMinutes: 30,
      rollover: null,
    });
  });
});

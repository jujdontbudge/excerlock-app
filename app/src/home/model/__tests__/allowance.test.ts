import { UNLIMITED } from "@excerlock/ledger";

import {
  BASE_ALLOWANCE_RANGE,
  allowanceLabel,
  enterFullLock,
  exitFullLock,
  isFullLock,
  setBaseAllowance,
  stepBaseAllowance,
  type AllowanceValues,
} from "../allowance";

const allowance = (
  baseAllowanceMinutes: number,
  allowanceBeforeFullLock: number | null = null,
): AllowanceValues => ({ baseAllowanceMinutes, allowanceBeforeFullLock });

describe("Full Lock", () => {
  it("is exactly a base allowance of zero (PRD §3.2 — no separate mode)", () => {
    expect(isFullLock(allowance(0))).toBe(true);
    expect(isFullLock(allowance(30))).toBe(false);
    expect(isFullLock(allowance(UNLIMITED))).toBe(false);
  });

  it("remembers the allowance it replaced so exit restores it", () => {
    const entered = enterFullLock(allowance(45));

    expect(entered).toEqual(allowance(0, 45));
    expect(exitFullLock(entered)).toEqual(allowance(45));
  });

  it("restores an unset allowance as unlimited, not as zero", () => {
    expect(exitFullLock(enterFullLock(allowance(UNLIMITED)))).toEqual(
      allowance(UNLIMITED),
    );
  });

  it("never overwrites the remembered allowance by entering twice", () => {
    const once = enterFullLock(allowance(45));

    expect(enterFullLock(once)).toEqual(once);
  });

  it("leaves an already-open allowance alone on exit", () => {
    expect(exitFullLock(allowance(45))).toEqual(allowance(45));
  });
});

describe("setting the base allowance", () => {
  it("replaces the allowance and forgets what Full Lock was holding", () => {
    expect(setBaseAllowance(allowance(0, 45), 90)).toEqual(allowance(90));
  });

  it("takes zero as entering Full Lock, so the picker and the switch agree", () => {
    expect(setBaseAllowance(allowance(45), 0)).toEqual(allowance(0, 45));
  });

  it("accepts unlimited as a value the user can choose", () => {
    expect(setBaseAllowance(allowance(45), UNLIMITED)).toEqual(
      allowance(UNLIMITED),
    );
  });
});

describe("the picker's grid (PRD §8 — 0–4 h in 5-min steps, plus Unlimited)", () => {
  it("runs from Full Lock to four hours in five-minute steps", () => {
    expect(BASE_ALLOWANCE_RANGE).toEqual({ min: 0, max: 240, step: 5 });
  });

  it("steps up and down the grid", () => {
    expect(stepBaseAllowance(30, 1)).toBe(35);
    expect(stepBaseAllowance(30, -1)).toBe(25);
  });

  it("stops at Full Lock rather than going negative", () => {
    expect(stepBaseAllowance(0, -1)).toBe(0);
  });

  it("puts Unlimited one step past the top of the grid, and back", () => {
    expect(stepBaseAllowance(240, 1)).toBe(UNLIMITED);
    expect(stepBaseAllowance(UNLIMITED, 1)).toBe(UNLIMITED);
    expect(stepBaseAllowance(UNLIMITED, -1)).toBe(240);
  });

  it("lands back on the grid from an off-grid value", () => {
    expect(stepBaseAllowance(32, 1)).toBe(35);
    expect(stepBaseAllowance(32, -1)).toBe(30);
  });

  it("names each end of the grid the way the user chose it", () => {
    expect(allowanceLabel(0)).toBe("Full Lock");
    expect(allowanceLabel(UNLIMITED)).toBe("Unlimited");
    expect(allowanceLabel(90)).toBe("1h 30m");
  });
});

import { describe, expect, it } from "vitest";

import { CONDITION_KINDS } from "../index";

describe("condition kind contract", () => {
  it("locks each kind to exactly one reward family", () => {
    expect(CONDITION_KINDS).toEqual([
      { kind: "state", rewardFamily: "sustainedUnlock" },
      { kind: "event", rewardFamily: "discretePayout" },
      { kind: "rate", rewardFamily: "proportionalCredit" },
    ]);
  });
});

import {
  resolveLockPrecedence,
  type LockPrecedenceInput,
} from "../lockPrecedence";

function input(
  overrides: Partial<LockPrecedenceInput> = {},
): LockPrecedenceInput {
  return {
    earnedBalanceMinutes: 0,
    activeWindow: null,
    fullLock: false,
    walking: false,
    ...overrides,
  };
}

describe("resolveLockPrecedence", () => {
  it.each([
    {
      conflict: "earned balance vs active lock window",
      value: input({ earnedBalanceMinutes: 30, activeWindow: true }),
      expected: {
        shields: "down",
        drainsBalance: true,
        cause: "earnedBalance",
      },
    },
    {
      conflict: "earned balance vs Full Lock",
      value: input({ earnedBalanceMinutes: 30, fullLock: true }),
      expected: {
        shields: "down",
        drainsBalance: true,
        cause: "earnedBalance",
      },
    },
    {
      conflict: "earned balance vs walking",
      value: input({ earnedBalanceMinutes: 30, walking: true }),
      expected: {
        shields: "down",
        drainsBalance: true,
        cause: "walking",
      },
    },
    {
      conflict: "active lock window vs Full Lock",
      value: input({ activeWindow: true, fullLock: true }),
      expected: {
        shields: "up",
        drainsBalance: false,
        cause: "fullLock",
      },
    },
    {
      conflict: "active lock window vs walking",
      value: input({ activeWindow: true, walking: true }),
      expected: {
        shields: "down",
        drainsBalance: false,
        cause: "walking",
      },
    },
    {
      conflict: "Full Lock vs walking",
      value: input({ fullLock: true, walking: true }),
      expected: {
        shields: "down",
        drainsBalance: false,
        cause: "walking",
      },
    },
  ])("settles $conflict in one policy", ({ value, expected }) => {
    expect(resolveLockPrecedence(value)).toEqual(expected);
  });

  it("opens without draining outside a configured lock window", () => {
    expect(resolveLockPrecedence(input({ activeWindow: false }))).toEqual({
      shields: "down",
      drainsBalance: false,
      cause: "outsideWindow",
    });
  });

  it("applies the economy all day when no lock windows exist", () => {
    expect(resolveLockPrecedence(input())).toEqual({
      shields: "up",
      drainsBalance: false,
      cause: "emptyBalance",
    });
  });
});

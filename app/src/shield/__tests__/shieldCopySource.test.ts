import {
  installShieldCopyOverrides,
  shieldCopySource,
} from "../shieldCopySource";

describe("shieldCopySource", () => {
  afterEach(() => installShieldCopyOverrides(undefined));

  it("holds one remotely supplied fixed copy set without client rotation", () => {
    installShieldCopyOverrides({
      balanceEmpty: {
        title: "Remote title",
        subtitle: "A 15-min walk gets you 20 more minutes.",
      },
    });

    expect(shieldCopySource.current()).toEqual({
      balanceEmpty: {
        title: "Remote title",
        subtitle: "A 15-min walk gets you 20 more minutes.",
      },
    });
    expect(shieldCopySource.current()).toBe(shieldCopySource.current());
  });

  it("falls back to bundled copy for an absent or malformed flag payload", () => {
    expect(shieldCopySource.current()).toEqual({});

    installShieldCopyOverrides({
      fullLock: { title: "   " },
      unknownCause: { title: "Not a variant" },
    });

    expect(shieldCopySource.current()).toEqual({});
  });
});

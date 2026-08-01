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

    expect(shieldCopySource.getOverrides()).toEqual({
      balanceEmpty: {
        title: "Remote title",
        subtitle: "A 15-min walk gets you 20 more minutes.",
      },
    });
    expect(shieldCopySource.getOverrides()).toBe(
      shieldCopySource.getOverrides(),
    );
  });

  it("falls back to bundled copy for an absent or malformed flag payload", () => {
    expect(shieldCopySource.getOverrides()).toEqual({});

    installShieldCopyOverrides({
      fullLock: { title: "   " },
      unknownCause: { title: "Not a variant" },
    });

    expect(shieldCopySource.getOverrides()).toEqual({});
  });
});

import {
  installShieldCopyOverrides,
  type ShieldCopyOverrides,
} from "..";

describe("shield public surface", () => {
  it("exposes the narrow PostHog copy-payload integration point", () => {
    const payload: ShieldCopyOverrides = {
      fullLock: { title: "Remote title" },
    };

    expect(() => installShieldCopyOverrides(payload)).not.toThrow();
    installShieldCopyOverrides(undefined);
  });
});

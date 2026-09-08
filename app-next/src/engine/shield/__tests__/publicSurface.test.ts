import {
  installShieldCopyOverrides,
  type NativeShieldCopyOverrides,
} from "..";

describe("shield public surface", () => {
  it("exposes the narrow PostHog copy-payload integration point", () => {
    const payload: NativeShieldCopyOverrides = {
      fullLock: { title: "Remote title" },
    };

    expect(() => installShieldCopyOverrides(payload)).not.toThrow();
    installShieldCopyOverrides(undefined);
  });
});

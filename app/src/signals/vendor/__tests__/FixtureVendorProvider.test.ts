import {
  VENDOR_FIXTURE_NAMES,
  FixtureVendorProvider,
  type VendorFixtureManifest,
  type VendorRateLimit,
} from "..";

describe("FixtureVendorProvider", () => {
  it("returns recorded today activity and emits future rate-limit state", async () => {
    const manifest: VendorFixtureManifest = {
      name: "provider-contract",
      version: 1,
      description: "A connected Strava activity followed by throttling.",
      timeline: [
        {
          atMs: -2_000,
          event: "vendor.connectionChanged",
          payload: { vendor: "strava", state: "connected" },
        },
        {
          atMs: -1_000,
          event: "vendor.activityAvailable",
          payload: {
            vendor: "strava",
            raw: { id: 123, sport_type: "Run", manual: false },
          },
        },
        {
          atMs: 1_000,
          event: "vendor.rateLimited",
          payload: { vendor: "strava", retryAfterS: 30 },
        },
      ],
    };
    const provider = new FixtureVendorProvider(manifest);
    const rateLimits: VendorRateLimit[] = [];
    provider.onRateLimited((event) => rateLimits.push(event));

    expect(provider.getConnectionState("strava")).toBe("connected");
    expect(await provider.fetchToday("strava")).toEqual([
      {
        vendor: "strava",
        atMs: -1_000,
        raw: { id: 123, sport_type: "Run", manual: false },
      },
    ]);

    provider.advanceTo(1_000);

    expect(rateLimits).toEqual([
      { vendor: "strava", atMs: 1_000, retryAfterS: 30 },
    ]);
  });

  it("publishes every canonical Vendor fixture name", () => {
    expect(VENDOR_FIXTURE_NAMES).toEqual([
      "strava-morning-run",
      "strava-manual-entry",
      "strava-trainer-ride",
      "whoop-pending-score",
      "polar-unflagged-manual",
      "oura-daily-activity",
      "none-connected",
    ]);
  });
});

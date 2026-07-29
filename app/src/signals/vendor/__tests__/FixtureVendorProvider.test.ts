import {
  VENDOR_FIXTURE_NAMES,
  FixtureVendorProvider,
  type VendorFixtureManifest,
} from "..";
import { runVendorProviderContract } from "../testing/providerContract";

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

runVendorProviderContract("FixtureVendorProvider", () => {
  const provider = new FixtureVendorProvider(manifest);
  return {
    provider,
    advanceTo: (atMs) => provider.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

describe("FixtureVendorProvider catalog", () => {
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

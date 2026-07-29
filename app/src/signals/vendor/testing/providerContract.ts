import type {
  VendorProvider,
  VendorRateLimit,
} from "..";

export interface VendorProviderHarness {
  readonly provider: VendorProvider;
  advanceTo(atMs: number): void;
  dispose(): void;
}

export function runVendorProviderContract(
  implementation: string,
  createHarness: () => VendorProviderHarness,
): void {
  describe(`${implementation} VendorProvider contract`, () => {
    it("returns recorded today activity and emits rate-limit state", async () => {
      const harness = createHarness();
      const rateLimits: VendorRateLimit[] = [];
      harness.provider.onRateLimited((event) => rateLimits.push(event));

      expect(harness.provider.getConnectionState("strava")).toBe("connected");
      expect(await harness.provider.fetchToday("strava")).toEqual([
        {
          vendor: "strava",
          atMs: -1_000,
          raw: { id: 123, sport_type: "Run", manual: false },
        },
      ]);

      harness.advanceTo(1_000);

      expect(rateLimits).toEqual([
        { vendor: "strava", atMs: 1_000, retryAfterS: 30 },
      ]);
      harness.dispose();
    });
  });
}

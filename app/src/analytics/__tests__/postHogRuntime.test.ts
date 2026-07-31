import { createAnalyticsKit } from "../AnalyticsKit";
import {
  initializePostHog,
  primeDeviceIdForFlags,
} from "../postHogRuntime";

describe("PostHog runtime initialization", () => {
  it("keeps analytics as a no-op when the public project key is absent", () => {
    const createClient = jest.fn();

    const client = initializePostHog(
      { apiKey: undefined, host: "https://us.i.posthog.com" },
      createAnalyticsKit(),
      createClient,
    );

    expect(client).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("primes the stable device id before refreshing device-bucketed flags", async () => {
    const calls: string[] = [];
    const client = {
      ready: async () => {
        calls.push("ready");
      },
      getDistinctId: () => {
        calls.push("distinct");
        return "anonymous_123";
      },
      getDeviceId: () => {
        calls.push("device");
        return "device_123";
      },
      reloadFeatureFlags: () => {
        calls.push("reload");
      },
    };

    await primeDeviceIdForFlags(client);

    expect(calls).toEqual(["ready", "distinct", "device", "reload"]);
  });
});

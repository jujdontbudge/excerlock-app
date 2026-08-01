import { createAnalyticsKit } from "../AnalyticsKit";
import {
  getActivePostHogClient,
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

  it("publishes the configured client for the single experiment provider", () => {
    const client = {
      register: jest.fn(),
      capture: jest.fn(),
      screen: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      ready: async () => {},
      getDistinctId: () => "anonymous_123",
      getDeviceId: () => "device_123",
      reloadFeatureFlags: jest.fn(),
      getFeatureFlagPayload: jest.fn(),
    };

    expect(
      initializePostHog(
        { apiKey: "phc_project", host: "https://us.i.posthog.com" },
        createAnalyticsKit(),
        () => client,
      ),
    ).toBe(client);
    expect(getActivePostHogClient()).toBe(client);
  });
});

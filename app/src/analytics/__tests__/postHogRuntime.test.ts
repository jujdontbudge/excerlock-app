import { createAnalyticsKit } from "../AnalyticsKit";
import { initializePostHog } from "../postHogRuntime";

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
});

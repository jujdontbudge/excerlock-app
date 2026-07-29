import { describe, expect, it } from "vitest";
import { createAnalytics } from "../src/services/analytics.js";

describe("server analytics", () => {
  it("is inert when POSTHOG_API_KEY is absent", async () => {
    const analytics = createAnalytics({
      apiKey: undefined,
      host: "https://us.i.posthog.com",
    });

    expect(() => {
      analytics.capture("user_123", "support_submitted", { kind: "bug" });
    }).not.toThrow();
    await expect(analytics.shutdown()).resolves.toBeUndefined();
  });
});

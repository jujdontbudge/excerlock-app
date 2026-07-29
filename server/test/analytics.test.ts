import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalytics } from "../src/services/analytics.js";

const postHog = vi.hoisted(() => ({
  capture: vi.fn(),
  register: vi.fn(async () => undefined),
  shutdown: vi.fn(async () => undefined),
}));

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = postHog.capture;
    register = postHog.register;
    shutdown = postHog.shutdown;
  },
}));

describe("server analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("registers and captures the ExcerLock app property", () => {
    const analytics = createAnalytics({
      apiKey: "phc_test",
      host: "https://us.i.posthog.com",
    });

    analytics.capture("user_123", "support_submitted", {
      app: "caller-value",
      kind: "bug",
    });

    expect(postHog.register).toHaveBeenCalledWith({ app: "excerlock" });
    expect(postHog.capture).toHaveBeenCalledWith({
      distinctId: "user_123",
      event: "support_submitted",
      properties: {
        app: "excerlock",
        kind: "bug",
      },
    });
  });
});

import {
  eventsOwnedBy,
  ownerOf,
  type PropsOf,
  type ServerEventName,
} from "@excerlock/analytics-events";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createAnalytics,
  type ServerAnalytics,
} from "../src/services/analytics.js";

type ServerEventFixture = {
  [Event in ServerEventName]: {
    event: Event;
    properties: PropsOf<Event>;
  };
}[ServerEventName];

/**
 * The events this server actually emits. The shared registry still declares
 * the retired vendor events (D6 removed the integrations, not the registry
 * entries); nothing here may emit one.
 */
const SERVER_EVENT_FIXTURES = [
  { event: "account_deleted", properties: {} },
  {
    event: "support_request_submitted",
    properties: { category: "feature" },
  },
] as const satisfies readonly ServerEventFixture[];

function assertServerCaptureTypeBoundary(analytics: ServerAnalytics): void {
  analytics.capture("user_123", "support_request_submitted", {
    category: "bug",
  });
  analytics.capture("user_123", "account_deleted", {});

  // @ts-expect-error Client-owned events cannot be captured by the server.
  analytics.capture("user_123", "paywall_viewed", {
    placement: "onboarding",
    has_trial: true,
  });
  // @ts-expect-error Adapty-owned events cannot be captured by the server.
  analytics.capture("user_123", "trial_started", {});
  // @ts-expect-error Support categories are the registry's closed enum.
  analytics.capture("user_123", "support_request_submitted", { category: "question" });
}

void assertServerCaptureTypeBoundary;

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
      analytics.capture("user_123", "support_request_submitted", {
        category: "bug",
      });
    }).not.toThrow();
    await expect(analytics.shutdown()).resolves.toBeUndefined();
  });

  it("accepts exactly the registry-owned server events and payloads", () => {
    const analytics = createAnalytics({
      apiKey: undefined,
      host: "https://us.i.posthog.com",
    });

    expect(eventsOwnedBy("server")).toEqual(
      expect.arrayContaining(SERVER_EVENT_FIXTURES.map(({ event }) => event)),
    );
    for (const { event } of SERVER_EVENT_FIXTURES) {
      expect(ownerOf(event)).toBe("server");
    }

    expectTypeOf<Parameters<ServerAnalytics["capture"]>[1]>().toEqualTypeOf<
      ServerEventName
    >();
    expectTypeOf<PropsOf<"support_request_submitted">>().toEqualTypeOf<{
      category: "support" | "bug" | "feature";
    }>();
    expect(() => {
      analytics.capture("user_123", "account_deleted", {});
      analytics.capture("user_123", "support_request_submitted", {
        category: "feature",
      });
    }).not.toThrow();
  });

  it("registers and captures the ExcerLock app property", () => {
    const analytics = createAnalytics({
      apiKey: "phc_test",
      host: "https://us.i.posthog.com",
    });

    analytics.capture("user_123", "support_request_submitted", {
      category: "bug",
    });

    expect(postHog.register).toHaveBeenCalledWith({ app: "excerlock" });
    expect(postHog.capture.mock.calls).toEqual([
      [
        {
          distinctId: "user_123",
          event: "support_request_submitted",
          properties: {
            app: "excerlock",
            category: "bug",
          },
        },
      ],
    ]);
  });

  it("exposes no vendor forwarder to call (D6)", () => {
    const analytics = createAnalytics({
      apiKey: "phc_test",
      host: "https://us.i.posthog.com",
    });

    expect(
      Object.keys(analytics).filter((key) => /vendor/i.test(key)),
    ).toEqual([]);
  });

  it("forwards one authoritative support submission event", () => {
    const analytics = createAnalytics({
      apiKey: "phc_test",
      host: "https://us.i.posthog.com",
    });

    analytics.supportRequestSubmitted("user_123", "feature");

    expect(postHog.capture.mock.calls).toEqual([
      [
        {
          distinctId: "user_123",
          event: "support_request_submitted",
          properties: {
            app: "excerlock",
            category: "feature",
          },
        },
      ],
    ]);
  });
});

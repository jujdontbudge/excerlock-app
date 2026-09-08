import type { ErrorEvent } from "@sentry/node";
import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "../src/instrument.js";

describe("Sentry event scrubbing", () => {
  it("removes user, request, and breadcrumb payloads before sending", () => {
    const event: ErrorEvent = {
      type: undefined,
      event_id: "event_123",
      user: {
        id: "user_123",
        email: "private@example.com",
      },
      request: {
        method: "POST",
        url: "https://api.example.test/v1/support?email=private@example.com",
        headers: {
          authorization: "Bearer secret",
          cookie: "session=secret",
        },
        data: {
          message: "private support message",
        },
      },
      breadcrumbs: [
        {
          category: "http",
          level: "info",
          message: "private@example.com",
          data: {
            token: "secret",
          },
        },
      ],
    };

    expect(scrubSentryEvent(event)).toEqual({
      event_id: "event_123",
      breadcrumbs: [
        {
          category: "http",
          level: "info",
        },
      ],
    });
  });
});

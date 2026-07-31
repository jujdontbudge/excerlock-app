import type { ErrorEvent } from "@sentry/react-native";

import { scrubSentryEvent } from "../sentry";

describe("client Sentry privacy scrub", () => {
  it("removes PII and breadcrumb content before an error can leave the device", () => {
    const event: ErrorEvent = {
      type: undefined,
      message: "Failed while checking Midtown Gym",
      user: { id: "user_123", email: "person@example.com" },
      request: { url: "excerlock://gym/40.7128,-74.0060" },
      extra: { activity_type: "run", steps: 8_000 },
      contexts: { location: { latitude: 40.7128, longitude: -74.006 } },
      tags: { condition: "morning run" },
      breadcrumbs: [
        {
          category: "ui.tap",
          level: "info",
          message: "Tapped Midtown Gym",
          data: { activity_type: "run" },
        },
      ],
    };

    expect(scrubSentryEvent(event)).toEqual({
      type: undefined,
      breadcrumbs: [{ category: "ui.tap", level: "info" }],
    });
  });
});

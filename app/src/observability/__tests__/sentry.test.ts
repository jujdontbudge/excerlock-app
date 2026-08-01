import type { ErrorEvent } from "@sentry/react-native";

import { buildSentryOptions, scrubSentryEvent } from "../sentry";

describe("client Sentry privacy scrub", () => {
  it("configures crash reports without replay, attachments, requests, or tracing", () => {
    const options = buildSentryOptions("https://public@example.ingest.sentry.io/1");

    expect(options).toMatchObject({
      attachScreenshot: false,
      attachThreads: false,
      attachViewHierarchy: false,
      dsn: "https://public@example.ingest.sentry.io/1",
      enableAppStartTracking: false,
      enableAutoPerformanceTracing: false,
      enableAutoSessionTracking: false,
      enableCaptureFailedRequests: false,
      enableNativeCrashHandling: true,
      enableNativeFramesTracking: false,
      enableStallTracking: false,
      enableUserInteractionTracing: false,
      replaysOnErrorSampleRate: 0,
      replaysSessionSampleRate: 0,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
    expect(options?.beforeSend).toBe(scrubSentryEvent);
    expect(buildSentryOptions("   ")).toBeNull();
  });

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

  it("removes exception messages and source context that can contain private device data", () => {
    const event = {
      type: undefined,
      exception: {
        values: [{
          type: "Error",
          value: "Midtown Gym at 40.7128 while walking",
          mechanism: { type: "generic", data: { activity: "run" } },
          stacktrace: {
            frames: [{
              filename: "condition.ts",
              function: "evaluateGymCondition",
              context_line: "evaluate(40.7128, 'Midtown Gym')",
              pre_context: ["const activity = 'run'"],
              post_context: ["return steps"],
              vars: { latitude: 40.7128 },
            }],
          },
        }],
      },
    } as ErrorEvent;

    expect(scrubSentryEvent(event)).toEqual({
      type: undefined,
      exception: {
        values: [{
          type: "Error",
          mechanism: { type: "generic" },
          stacktrace: {
            frames: [{
              filename: "condition.ts",
              function: "evaluateGymCondition",
            }],
          },
        }],
      },
    });
  });
});

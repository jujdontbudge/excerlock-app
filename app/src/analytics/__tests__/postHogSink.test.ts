import { buildPostHogOptions } from "../postHogSink";

describe("PostHog client transport", () => {
  it("allows only explicit events and disables every automatic capture surface", () => {
    expect(buildPostHogOptions("https://us.i.posthog.com")).toMatchObject({
      host: "https://us.i.posthog.com",
      captureAppLifecycleEvents: false,
      disableGeoip: true,
      disableSurveys: true,
      enableSessionReplay: false,
      errorTracking: {
        autocapture: false,
        exceptionSteps: { enabled: false },
      },
    });
  });
});

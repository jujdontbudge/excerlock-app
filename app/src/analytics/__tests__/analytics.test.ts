import { LEGACY_FLOW_SCREENS } from "@excerlock/analytics-events";

import { analytics, createRecordingSink, flowTracker } from "..";

describe("the app-wide kit", () => {
  it("no-ops until a transport is installed, then routes everything through it", () => {
    analytics.track("rating_prompt_shown", { source: "settings" });

    const sink = createRecordingSink();
    analytics.installSink(sink);
    analytics.track("walking_session_started");
    flowTracker.trackOnboardingScreen(LEGACY_FLOW_SCREENS[0]);

    expect(sink.signals).toEqual([
      { kind: "register", props: { app: "excerlock" } },
      { kind: "capture", event: "walking_session_started", props: {} },
      { kind: "screen", screen: LEGACY_FLOW_SCREENS[0], props: {} },
      {
        kind: "capture",
        event: "onboarding_screen_viewed",
        props: { screen: LEGACY_FLOW_SCREENS[0] },
      },
    ]);
  });

  it("shares one transport between the kit and the FLOW tracker", () => {
    const sink = createRecordingSink();
    analytics.installSink(sink);
    sink.clear();

    flowTracker.trackOnboardingAnswer("confession", 360);
    analytics.track("shields_lifted");

    expect(sink.eventNames()).toEqual(["onboarding_answer", "shields_lifted"]);
  });
});

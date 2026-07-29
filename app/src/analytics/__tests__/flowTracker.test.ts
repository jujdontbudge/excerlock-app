import { FLOW_SCREENS } from "@excerlock/analytics-events";

import { createAnalyticsKit, createFlowTracker, createRecordingSink } from "..";

function trackerOnRecordingSink() {
  const sink = createRecordingSink();
  const tracker = createFlowTracker(createAnalyticsKit(sink));
  sink.clear();
  return { sink, tracker };
}

describe("FLOW funnel helpers (PRD §10.5)", () => {
  it("fires $screen before onboarding_screen_viewed for the same screen", () => {
    const { sink, tracker } = trackerOnRecordingSink();

    tracker.trackOnboardingScreen("mirror");

    expect(sink.signals).toEqual([
      { kind: "screen", screen: "mirror", props: {} },
      { kind: "capture", event: "onboarding_screen_viewed", props: { screen: "mirror" } },
    ]);
  });

  it("emits one funnel step per screen, in the imported FLOW_SCREENS order", () => {
    const { sink, tracker } = trackerOnRecordingSink();

    for (const screen of FLOW_SCREENS) {
      tracker.trackOnboardingScreen(screen);
    }

    expect(sink.captured()).toEqual(
      FLOW_SCREENS.map((screen) => ({
        event: "onboarding_screen_viewed",
        props: { screen },
      })),
    );
    expect(sink.signals).toHaveLength(FLOW_SCREENS.length * 2);
  });

  it("records answers against the screen that asked, without touching $screen", () => {
    const { sink, tracker } = trackerOnRecordingSink();

    tracker.trackOnboardingAnswer("confession", 360);
    tracker.trackOnboardingAnswer("pick-apps", true);

    expect(sink.signals).toEqual([
      { kind: "capture", event: "onboarding_answer", props: { screen: "confession", value: 360 } },
      { kind: "capture", event: "onboarding_answer", props: { screen: "pick-apps", value: true } },
    ]);
  });

  it("interleaves views and answers exactly as the central renderer will", () => {
    const { sink, tracker } = trackerOnRecordingSink();

    tracker.trackOnboardingScreen("value-prop");
    tracker.trackOnboardingScreen("confession");
    tracker.trackOnboardingAnswer("confession", 360);
    tracker.trackOnboardingScreen("mirror");

    expect(sink.eventNames()).toEqual([
      "onboarding_screen_viewed",
      "onboarding_screen_viewed",
      "onboarding_answer",
      "onboarding_screen_viewed",
    ]);
  });

  it("goes nowhere on a kit with no transport installed", () => {
    const tracker = createFlowTracker(createAnalyticsKit());

    expect(() => {
      for (const screen of FLOW_SCREENS) {
        tracker.trackOnboardingScreen(screen);
      }
      tracker.trackOnboardingAnswer("confession", 360);
    }).not.toThrow();
  });
});

import { eventsOwnedBy } from "@excerlock/analytics-events";

import { SUPER_PROPERTIES, createAnalyticsKit, createRecordingSink } from "..";

describe("AnalyticsKit transport wiring", () => {
  it("defaults to the no-op sink so an unconfigured app never crashes", () => {
    const kit = createAnalyticsKit();

    expect(() => {
      kit.track("shields_applied", { cause: "full_lock" });
      kit.trackScreen("home");
      kit.identify("user_123");
      kit.reset();
    }).not.toThrow();
  });

  it("registers the D2 super property on the sink it is given", () => {
    const sink = createRecordingSink();

    createAnalyticsKit(sink);

    expect(sink.signals).toEqual([{ kind: "register", props: { app: "excerlock" } }]);
    expect(SUPER_PROPERTIES).toEqual({ app: "excerlock" });
  });

  it("re-registers when a real transport is installed at boot", () => {
    const kit = createAnalyticsKit();
    const sink = createRecordingSink();

    kit.track("diagnostics_shared");
    kit.installSink(sink);
    kit.track("data_export_requested");

    expect(sink.signals).toEqual([
      { kind: "register", props: { app: "excerlock" } },
      { kind: "capture", event: "data_export_requested", props: {} },
    ]);
  });
});

describe("AnalyticsKit.track", () => {
  it("keeps health sources and workout metrics out of analytics properties", () => {
    const sink = createRecordingSink();
    const kit = createAnalyticsKit(sink);

    kit.track("earn_claimed", {
      kind: "rate",
      signal: "steps",
      source: "healthkit",
      payout: "rate_credit",
      minutes_earned: 12,
    });

    expect(sink.captured()).toEqual([{ event: "earn_claimed", props: {} }]);
  });

  it("forwards the event name and its exact payload", () => {
    const sink = createRecordingSink();
    const kit = createAnalyticsKit(sink);

    kit.track("paywall_viewed", { placement: "onboarding", has_trial: true });

    expect(sink.captured()).toEqual([
      { event: "paywall_viewed", props: { placement: "onboarding", has_trial: true } },
    ]);
  });

  it("sends an empty payload for the events that declare no properties", () => {
    const sink = createRecordingSink();
    const kit = createAnalyticsKit(sink);

    kit.track("sick_day_override_used");

    expect(sink.captured()).toEqual([{ event: "sick_day_override_used", props: {} }]);
  });

  it("can emit every client-owned event in the registry and nothing else", () => {
    const sink = createRecordingSink();
    const kit = createAnalyticsKit(sink);
    const clientEvents = eventsOwnedBy("client");

    for (const event of clientEvents) {
      // The payload is type-checked per event at real call sites; this walk only
      // proves the kit forwards every client-owned name (see __typechecks__).
      (kit.track as (name: string, props: Record<string, never>) => void)(event, {});
    }

    expect(sink.eventNames()).toEqual(clientEvents);
    expect(clientEvents).not.toContain("support_request_submitted");
    expect(clientEvents).not.toContain("trial_started");
  });
});

describe("AnalyticsKit identity plumbing", () => {
  it("passes the distinct id straight through and resets on sign-out", () => {
    const sink = createRecordingSink();
    const kit = createAnalyticsKit(sink);

    kit.identify("user_2abc");
    kit.reset();

    expect(sink.signals.slice(1)).toEqual([
      { kind: "identify", distinctId: "user_2abc", props: {} },
      { kind: "reset" },
    ]);
  });

  it("tracks a screen manually — autocapture stays off (D11)", () => {
    const sink = createRecordingSink();
    const kit = createAnalyticsKit(sink);

    kit.trackScreen("home");

    expect(sink.signals.slice(1)).toEqual([{ kind: "screen", screen: "home", props: {} }]);
  });
});

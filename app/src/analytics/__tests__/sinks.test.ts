import { createRecordingSink, noopSink } from "..";

describe("no-op sink (the default transport)", () => {
  it("accepts every signal and returns nothing", () => {
    expect(() => {
      noopSink.register({ app: "excerlock" });
      noopSink.capture("shields_applied", { cause: "full_lock" });
      noopSink.screen("value-prop", {});
      noopSink.identify("user_123", {});
      noopSink.reset();
    }).not.toThrow();
  });
});

describe("recording sink (the test double)", () => {
  it("records signals in emission order", () => {
    const sink = createRecordingSink();

    sink.register({ app: "excerlock" });
    sink.screen("value-prop", {});
    sink.capture("shields_applied", { cause: "full_lock" });
    sink.identify("user_123", {});
    sink.reset();

    expect(sink.signals).toEqual([
      { kind: "register", props: { app: "excerlock" } },
      { kind: "screen", screen: "value-prop", props: {} },
      { kind: "capture", event: "shields_applied", props: { cause: "full_lock" } },
      { kind: "identify", distinctId: "user_123", props: {} },
      { kind: "reset" },
    ]);
  });

  it("exposes captured events without the transport noise around them", () => {
    const sink = createRecordingSink();

    sink.register({ app: "excerlock" });
    sink.capture("paywall_viewed", { placement: "onboarding", has_trial: true });
    sink.screen("paywall", {});
    sink.capture("purchase_started", { placement: "onboarding", plan_id: "annual" });

    expect(sink.captured()).toEqual([
      { event: "paywall_viewed", props: { placement: "onboarding", has_trial: true } },
      { event: "purchase_started", props: { placement: "onboarding", plan_id: "annual" } },
    ]);
    expect(sink.eventNames()).toEqual(["paywall_viewed", "purchase_started"]);
  });

  it("keeps a bounded ring buffer so a long session cannot grow without limit", () => {
    const sink = createRecordingSink(3);

    for (const cause of ["balance_empty", "full_lock", "lock_window", "walk_session_ended"]) {
      sink.capture("shields_applied", { cause });
    }

    expect(sink.signals).toHaveLength(3);
    expect(sink.captured().map(({ props }) => props.cause)).toEqual([
      "full_lock",
      "lock_window",
      "walk_session_ended",
    ]);
  });

  it("clears back to an empty buffer", () => {
    const sink = createRecordingSink();

    sink.capture("diagnostics_shared", {});
    sink.clear();

    expect(sink.signals).toEqual([]);
  });
});

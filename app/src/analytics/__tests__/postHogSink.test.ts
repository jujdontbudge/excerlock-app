import { PostHogPersistedProperty } from "posthog-react-native";
import { buildPostHogOptions, createPostHogSink } from "../postHogSink";

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

  it("adapts the typed analytics transport to the PostHog client", async () => {
    const client = {
      register: jest.fn(),
      capture: jest.fn(),
      screen: jest.fn(),
      identify: jest.fn(),
      flush: jest.fn(async () => undefined),
      optOut: jest.fn(async () => undefined),
      reset: jest.fn(),
      setPersistedProperty: jest.fn(),
    };
    const sink = createPostHogSink(client);

    sink.register({ app: "excerlock" });
    sink.capture("paywall_viewed", { placement: "onboarding", has_trial: true });
    sink.screen("paywall", {});
    sink.identify("user_123", {});
    await sink.flush();
    await sink.discardPending();
    sink.reset();

    expect(client.register).toHaveBeenCalledWith({ app: "excerlock" });
    expect(client.capture).toHaveBeenCalledWith("paywall_viewed", {
      placement: "onboarding",
      has_trial: true,
    });
    expect(client.screen).toHaveBeenCalledWith("paywall", {});
    expect(client.identify).toHaveBeenCalledWith("user_123", {});
    expect(client.flush).toHaveBeenCalledWith();
    expect(client.setPersistedProperty.mock.calls).toEqual([
      [PostHogPersistedProperty.Queue, null],
      [PostHogPersistedProperty.AiQueue, null],
      [PostHogPersistedProperty.LogsQueue, null],
    ]);
    expect(client.optOut).toHaveBeenCalledWith();
    expect(client.reset).toHaveBeenCalledWith();
  });
});

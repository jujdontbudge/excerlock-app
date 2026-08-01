jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  FLOW_SCREENS,
  type FlowScreen,
} from "@excerlock/analytics-events";
import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  analytics,
  createRecordingSink,
  noopSink,
  type AnalyticsSignal,
  type RecordingSink,
} from "../../analytics";
import {
  DEFAULT_CONFESSION,
  DEFAULT_ONBOARDING_PROGRESS,
  OnboardingFlow,
  useConfessionStore,
  useOnboardingStore,
} from "..";

function expectedStepViewSignals(
  flowScreen: FlowScreen,
): AnalyticsSignal[] {
  return [
    { kind: "screen", screen: flowScreen, props: {} },
    {
      kind: "capture",
      event: "onboarding_screen_viewed",
      props: { screen: flowScreen },
    },
  ];
}

describe("onboarding analytics", () => {
  let recordingSink: RecordingSink;

  beforeEach(() => {
    useConfessionStore.setState(DEFAULT_CONFESSION);
    useOnboardingStore.setState(DEFAULT_ONBOARDING_PROGRESS);
    recordingSink = createRecordingSink();
    analytics.installSink(recordingSink);
    recordingSink.clear();
  });

  afterEach(() => {
    analytics.installSink(noopSink);
  });

  it("emits the locked flow sequence with exact screen and answer payloads", async () => {
    const onComplete = jest.fn();
    await render(<OnboardingFlow onComplete={onComplete} />);

    for (const flowScreen of FLOW_SCREENS) {
      if (flowScreen === "confession") {
        await fireEvent(
          screen.getByRole("adjustable", { name: "Daily phone time" }),
          "accessibilityAction",
          { nativeEvent: { actionName: "increment" } },
        );
      }

      await fireEvent.press(screen.getAllByRole("button")[0]);
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(recordingSink.signals).toEqual(
      FLOW_SCREENS.flatMap((flowScreen) => [
        ...expectedStepViewSignals(flowScreen),
        ...(flowScreen === "confession"
          ? [
              {
                kind: "capture",
                event: "onboarding_answer",
                props: {
                  screen: flowScreen,
                },
              },
            ]
          : []),
      ]),
    );
  });

  it("does not emit a duplicate step view when the flow re-renders", async () => {
    const firstScreen = FLOW_SCREENS[0];
    const renderedFlow = await render(
      <OnboardingFlow onComplete={jest.fn()} />,
    );

    await renderedFlow.rerender(
      <OnboardingFlow onComplete={jest.fn()} />,
    );

    expect(recordingSink.signals).toEqual(
      expectedStepViewSignals(firstScreen),
    );
  });

  it("does not emit duplicate step views when back navigation revisits them", async () => {
    await render(<OnboardingFlow onComplete={jest.fn()} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Get started" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Get started" }),
    );

    expect(recordingSink.signals).toEqual(
      FLOW_SCREENS.slice(0, 2).flatMap(expectedStepViewSignals),
    );
  });
});

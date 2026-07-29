jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { FLOW_SCREENS } from "@excerlock/analytics-events";
import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  analytics,
  createRecordingSink,
  noopSink,
  type RecordingSink,
} from "../../analytics";
import {
  DEFAULT_CONFESSION,
  DEFAULT_ONBOARDING_PROGRESS,
  OnboardingFlow,
  useConfessionStore,
  useOnboardingStore,
} from "..";

const CONFESSED_DAILY_MINUTES = 330;

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
        { kind: "screen", screen: flowScreen, props: {} },
        {
          kind: "capture",
          event: "onboarding_screen_viewed",
          props: { screen: flowScreen },
        },
        ...(flowScreen === "confession"
          ? [
              {
                kind: "capture",
                event: "onboarding_answer",
                props: {
                  screen: flowScreen,
                  value: CONFESSED_DAILY_MINUTES,
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

    expect(recordingSink.signals).toEqual([
      { kind: "screen", screen: firstScreen, props: {} },
      {
        kind: "capture",
        event: "onboarding_screen_viewed",
        props: { screen: firstScreen },
      },
    ]);
  });
});

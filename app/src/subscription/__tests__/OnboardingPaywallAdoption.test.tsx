jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { PaywallScreen } from "../../onboarding/screens/PaywallScreen";
import {
  DEFAULT_CONFESSION,
  useConfessionStore,
} from "../../onboarding/store/confessionStore";

describe("onboarding paywall adoption", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useConfessionStore.setState(DEFAULT_CONFESSION);
  });

  it("advances to post-purchase sign-up only after anonymous purchase", async () => {
    const onContinue = jest.fn();
    useConfessionStore.setState({ confessedDailyMinutes: 330 });
    await render(
      <PaywallScreen onContinue={onContinue} onBack={jest.fn()} />,
    );

    expect(
      await screen.findByText(
        "You told us 5 hours 30 minutes a day. The annual plan is about $5 a month.",
      ),
    ).toBeOnTheScreen();
    expect(onContinue).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Start free trial" }),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

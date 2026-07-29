jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MockSubscriptionModule } from "../MockSubscriptionModule";
import { SubscriptionPaywall } from "../SubscriptionPaywall";

describe("SubscriptionPaywall", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("renders confessed usage and the remote-shaped plans while locked", async () => {
    await render(
      <SubscriptionPaywall
        placement="onboarding"
        confessedDailyMinutes={300}
        onEntitled={jest.fn()}
        subscription={new MockSubscriptionModule()}
      />,
    );

    expect(
      await screen.findByRole("header", {
        name: "Unlock the full ExcerLock plan",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "You told us 5 hours a day. The annual plan is about $5 a month.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Annual and monthly plans")).toBeOnTheScreen();
    expect(
      screen.getByRole("radio", {
        name: "Annual, $59.99 / year",
        checked: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("radio", {
        name: "Monthly, $9.99 / month",
        checked: false,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Trial available on the annual plan"),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Start free trial" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Restore Purchases" }),
    ).toBeEnabled();
  });

  it("renders entitled access instead of offering another purchase", async () => {
    const subscription = new MockSubscriptionModule();
    await subscription.loadPaywall("onboarding");
    await subscription.purchase("excerlock_annual");
    const onEntitled = jest.fn();
    await render(
      <SubscriptionPaywall
        placement="onboarding"
        confessedDailyMinutes={300}
        onEntitled={onEntitled}
        subscription={subscription}
      />,
    );

    expect(
      await screen.findByRole("header", {
        name: "Your ExcerLock plan is active",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Premium access is unlocked.")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Start free trial" }),
    ).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onEntitled).toHaveBeenCalledTimes(1);
  });
});

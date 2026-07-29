jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { eventsOwnedBy } from "@excerlock/analytics-events";
import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  analytics,
  createRecordingSink,
  noopSink,
  type RecordingSink,
} from "../../analytics";
import { MockSubscriptionModule } from "../MockSubscriptionModule";
import { SubscriptionPaywall } from "../SubscriptionPaywall";

describe("subscription analytics ownership", () => {
  let recordingSink: RecordingSink;

  beforeEach(async () => {
    await AsyncStorage.clear();
    recordingSink = createRecordingSink();
    analytics.installSink(recordingSink);
    recordingSink.clear();
  });

  afterEach(() => {
    analytics.installSink(noopSink);
  });

  it("emits client funnel intents and no Adapty-owned lifecycle event", async () => {
    await render(
      <SubscriptionPaywall
        placement="onboarding"
        confessedDailyMinutes={300}
        onEntitled={jest.fn()}
        subscription={new MockSubscriptionModule()}
      />,
    );
    await screen.findByRole("header", {
      name: "Unlock the full ExcerLock plan",
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Start free trial" }),
    );

    const emittedNames = recordingSink.eventNames();
    expect(emittedNames).toEqual(["paywall_viewed", "purchase_started"]);
    expect(
      emittedNames.filter((event) =>
        eventsOwnedBy("adapty").includes(event as never),
      ),
    ).toEqual([]);
  });
});

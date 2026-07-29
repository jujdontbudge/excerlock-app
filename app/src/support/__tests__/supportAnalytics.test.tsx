jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { eventsOwnedBy } from "@excerlock/analytics-events";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import {
  analytics,
  createRecordingSink,
  noopSink,
  type RecordingSink,
} from "../../analytics";
import { MockSupportModule } from "../MockSupportModule";
import { SupportSettingsCard } from "../components/SupportSettingsCard";

describe("support analytics ownership", () => {
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

  it("emits no server-owned support event from submissions or votes", async () => {
    await render(<SupportSettingsCard module={new MockSupportModule()} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Contact support" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("How can we help?"),
      "Please help with my balance.",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send support request" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Sent")).toBeOnTheScreen();
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Request a feature" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Feature title"),
      "Home Screen widget",
    );
    await fireEvent.changeText(
      screen.getByLabelText("What would make ExcerLock better?"),
      "Show my balance without opening the app.",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Submit feature request" }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Vote for Home Screen widget" }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Vote for Home Screen widget" }),
    );

    const serverOwnedEvents = new Set<string>(eventsOwnedBy("server"));
    expect(serverOwnedEvents).toContain("support_request_submitted");
    expect(
      recordingSink
        .eventNames()
        .filter((event) => serverOwnedEvents.has(event)),
    ).toEqual([]);
  });
});

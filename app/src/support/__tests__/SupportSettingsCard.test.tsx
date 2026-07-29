jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { SupportSettingsCard } from "..";
import { MockSupportModule } from "../MockSupportModule";

describe("SupportSettingsCard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("submits a support request and renders its sent state", async () => {
    const support = new MockSupportModule();
    await render(<SupportSettingsCard module={support} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Contact support" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("How can we help?"),
      "My workout did not unlock my apps.",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send support request" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Sent")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("My workout did not unlock my apps."),
    ).toBeOnTheScreen();
  });

  it("keeps an offline request visible and retries only when the user asks", async () => {
    const support = new MockSupportModule();
    support.setOnline(false);
    await render(<SupportSettingsCard module={support} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Contact support" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("How can we help?"),
      "My permission status looks wrong.",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send support request" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Not sent")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "You're offline. This wasn't sent. It is saved here so you can try again.",
      ),
    ).toBeOnTheScreen();

    support.setOnline(true);
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Try again: My permission status looks wrong.",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Sent")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Not sent")).toBeNull();
  });
});

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { DEFAULT_SETTINGS, SettingsScreen, useSettingsStore } from "..";

describe("SettingsScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState(DEFAULT_SETTINGS);
  });

  it("shows the grace control and explains the app-fixed walking values", async () => {
    await render(<SettingsScreen />);

    expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Walk & Scroll" })).toBeOnTheScreen();
    expect(screen.getByText("Choose a grace period")).toBeOnTheScreen();
    expect(screen.getByText("Around 60–70 steps/min")).toBeOnTheScreen();
    expect(
      screen.getByText("Fixed to keep walking detection trustworthy."),
    ).toBeOnTheScreen();
    expect(screen.getByText("15 minutes")).toBeOnTheScreen();
    expect(
      screen.getByText("Fixed to Apple's minimum monitoring interval."),
    ).toBeOnTheScreen();
  });

  it("lets the user choose and see an allowed grace period", async () => {
    await render(<SettingsScreen />);

    fireEvent.press(screen.getByRole("button", { name: "2 minutes" }));

    await waitFor(() => {
      expect(
        screen.getByLabelText("Selected grace period: 2 minutes"),
      ).toBeOnTheScreen();
    });
  });

  it("mounts the real signed-out account surface and keeps support rows static", async () => {
    await render(<SettingsScreen />);

    expect(await screen.findByText("Signed out")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "Your conditions, earning history, and locks stay on this device.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Contact support")).toBeOnTheScreen();
    expect(screen.getByText("Request a feature")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Contact support" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Request a feature" })).toBeNull();
  });

  it("shows the debug-menu entry in development builds", async () => {
    await render(<SettingsScreen />);

    expect(screen.getByText("Debug menu")).toBeOnTheScreen();
  });
});

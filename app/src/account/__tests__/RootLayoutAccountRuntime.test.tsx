jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { render, screen } from "@testing-library/react-native";

import RootLayout from "../../../app/_layout";

const mockAccountRuntimeRoot = jest.fn(
  ({ children }: { children: React.ReactNode }) => children,
);

jest.mock("expo-router", () => ({ Stack: () => null }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/ui", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/account", () => ({
  AccountRuntimeRoot: (props: { children: React.ReactNode }) =>
    mockAccountRuntimeRoot(props),
}));
jest.mock("@/screentime/native/NativeScreenTimePickerHost", () => ({
  NativeScreenTimePickerHost: () => null,
}));
jest.mock("@/notifications", () => ({
  NativeShieldNotificationResponseHost: () => null,
}));
jest.mock("@/home/signals", () => ({ SignalRuntimeHosts: () => null }));
jest.mock("@/signals/location/registerLocationTasks", () => ({}));

describe("RootLayout account composition", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_TEST_HARNESS;
    mockAccountRuntimeRoot.mockClear();
  });

  it("mounts the account runtime around the routed app", async () => {
    await render(<RootLayout />);

    expect(mockAccountRuntimeRoot).toHaveBeenCalledTimes(1);
  });

  it("lands on the harness without mounting any product runtime host", async () => {
    process.env.EXPO_PUBLIC_TEST_HARNESS = "1";

    await render(<RootLayout />);

    expect(screen.getByText("Physical test tasks")).toBeOnTheScreen();
    expect(mockAccountRuntimeRoot).not.toHaveBeenCalled();
  });
});

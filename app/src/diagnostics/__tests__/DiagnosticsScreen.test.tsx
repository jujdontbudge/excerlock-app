jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { render, screen } from "@testing-library/react-native";

import { isDiagnosticsEnabled } from "../accessor";
import { DiagnosticsLog, type DiagnosticsStorage } from "../DiagnosticsLog";
import { DiagnosticsScreen } from "../DiagnosticsScreen";

function memoryStorage(): DiagnosticsStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}

describe("DiagnosticsScreen", () => {
  it("shows recorded events newest first, so the last thing that happened is on top", async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 0 });
    log.append("motion.start");
    log.append("motion.cadence", { stepsPerSecond: 1.2 });

    await render(<DiagnosticsScreen log={log} />);

    expect(screen.getByText("2 recorded events, newest first.")).toBeOnTheScreen();
    expect(screen.getByText('{"stepsPerSecond":1.2}')).toBeOnTheScreen();
  });

  it("says so when nothing has been recorded rather than showing a blank screen", async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 0 });

    await render(<DiagnosticsScreen log={log} />);

    expect(
      screen.getByText("Nothing recorded yet. Start a walk session and come back."),
    ).toBeOnTheScreen();
  });
});

describe("diagnostics gating", () => {
  it("stays off unless a build opts in, so a shipped app carries none of this", () => {
    expect(process.env.EXPO_PUBLIC_DIAGNOSTICS).toBeUndefined();
    expect(isDiagnosticsEnabled()).toBe(false);
  });
});

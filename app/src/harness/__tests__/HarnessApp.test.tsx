import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import { View } from "react-native";
import type { DiagnosticsStorage } from "@/diagnostics/DiagnosticsLog";
import { HarnessApp } from "../HarnessApp";
import { HarnessRunStore } from "../HarnessRunStore";
import { PlacementHarnessSignalSource } from "../PlacementHarnessSignalSource";
import { FixturePhonePlacementProvider } from "@/signals/placement";

function memoryStorage(): DiagnosticsStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => void values.set(key, value),
    removeItem: async (key) => void values.delete(key),
  };
}

describe("HarnessApp", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });

  afterEach(() => jest.useRealTimers());

  it("opens a declarative task, records truth, and reopens the saved run", async () => {
    const store = new HarnessRunStore(memoryStorage());
    await render(
      <HarnessApp
        buildCommit="abc123"
        sources={{
          placement: new PlacementHarnessSignalSource(
            new FixturePhonePlacementProvider([]),
          ),
        }}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByText("Marker-only harness check"));
    expect(screen.getByText("Countdown")).toBeOnTheScreen();

    await act(async () => jest.advanceTimersByTimeAsync(3_000));
    jest.setSystemTime(4_250);
    await fireEvent.press(screen.getByText("I started"));
    await fireEvent.press(screen.getByText("Stop run"));
    await fireEvent.press(screen.getByText("Back to tasks"));
    await act(async () => undefined);

    expect(screen.getByText("marker-only-4000")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("marker-only-4000"));
    expect(screen.getByText("Ended: stopped")).toBeOnTheScreen();
    expect(screen.getByText("I started @ 4250")).toBeOnTheScreen();

    const share = jest.spyOn(Share, "share").mockResolvedValue({
      action: Share.sharedAction,
    });
    await fireEvent.press(screen.getByText("Export run"));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('"recordType":"run"'),
      }),
    );
  });

  it("shows the live camera preview above markers and deletes all footage", async () => {
    const footage = { deleteAll: jest.fn(async () => undefined) };
    const store = new HarnessRunStore(memoryStorage(), footage);
    const camera = {
      id: "camera" as const,
      prepare: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
    };
    function Preview() {
      return <View accessibilityLabel="Live camera preview" />;
    }
    await render(
      <HarnessApp
        buildCommit="abc123"
        CameraPreview={Preview}
        sources={{ camera }}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByText("Delete all captured footage"));
    expect(footage.deleteAll).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText("C1 — treadmill walking"));

    expect(screen.getByLabelText("Live camera preview")).toBeOnTheScreen();
    expect(camera.prepare).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Walking throughout the recording")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText("Walking throughout the recording")).toBeOnTheScreen();
  });
});

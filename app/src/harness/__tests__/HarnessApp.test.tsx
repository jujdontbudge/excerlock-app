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
    await fireEvent.changeText(screen.getByLabelText("Run note"), "Quiet room");
    await fireEvent.press(screen.getByText("Start run"));
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
    expect(screen.getByText("Note: Quiet room")).toBeOnTheScreen();
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
    await fireEvent.press(screen.getByText("Start run"));
    expect(camera.prepare).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Walking throughout the recording")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText("Walking throughout the recording")).toBeOnTheScreen();
  });

  it("shows a camera source failure on screen instead of leaving an unexplained black panel", async () => {
    const camera = {
      id: "camera" as const,
      prepare: jest.fn(async () => {
        throw new Error("native camera unavailable");
      }),
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
    };
    await render(
      <HarnessApp
        buildCommit="abc123"
        CameraPreview={() => <View accessibilityLabel="Camera panel" />}
        sources={{ camera }}
        store={new HarnessRunStore(memoryStorage())}
      />,
    );

    await fireEvent.press(screen.getByText("C1 — treadmill walking"));
    await fireEvent.press(screen.getByText("Start run"));
    await act(async () => jest.advanceTimersByTimeAsync(10_000));

    expect(
      screen.getByText("Camera failed: native camera unavailable"),
    ).toBeOnTheScreen();
    expect(camera.start).not.toHaveBeenCalled();
  });

  it("collects M4 speed and a note before the run starts", async () => {
    const store = new HarnessRunStore(memoryStorage());
    await render(<HarnessApp buildCommit="abc123" store={store} sources={{}} />);

    await fireEvent.press(screen.getByText("Treadmill walking, phone in hand"));
    expect(screen.getByText("Set up run")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Treadmill speed"), "2.5");
    await fireEvent.changeText(screen.getByLabelText("Run note"), "Belt juddered once");
    await fireEvent.press(screen.getByText("Start run"));
    await act(async () => jest.advanceTimersByTimeAsync(3_000));
    await fireEvent.press(screen.getByText("Stop run"));
    await fireEvent.press(screen.getByText("Back to tasks"));
    await act(async () => undefined);
    await fireEvent.press(screen.getByText("M4-4000"));

    expect(screen.getByText("Parameter treadmillSpeedMph: 2.5")).toBeOnTheScreen();
    expect(screen.getByText("Note: Belt juddered once")).toBeOnTheScreen();
  });
});

describe("HarnessApp stranded runs", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });
  afterEach(() => jest.useRealTimers());

  it("closes a run left open by a killed app and flags it in the list", async () => {
    const store = new HarnessRunStore(memoryStorage());
    await store.save({
      version: 1,
      id: "M2-500",
      testId: "M2",
      buildCommit: "abc123",
      startedAtMs: 500,
      events: [{ type: "app-state", atMs: 67_500, state: "background" }],
    });

    await render(<HarnessApp buildCommit="abc123" sources={{}} store={store} />);
    await act(async () => undefined);

    expect(screen.getByText("stranded · needs attention")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("M2-500"));
    expect(screen.getByText("Ended: stranded")).toBeOnTheScreen();
  });
});

describe("HarnessApp liveness", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });
  afterEach(() => jest.useRealTimers());

  it("leaves a task without starting a run, so opening one is not a trap", async () => {
    await render(<HarnessApp buildCommit="abc123" store={new HarnessRunStore(memoryStorage())} />);

    await fireEvent.press(screen.getByText("Marker-only harness check"));
    expect(screen.getByText("Set up run")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Back to tasks"));

    expect(screen.getByText("Physical test tasks")).toBeOnTheScreen();
  });

  it("counts the countdown down in seconds", async () => {
    await render(<HarnessApp buildCommit="abc123" store={new HarnessRunStore(memoryStorage())} />);

    await fireEvent.press(screen.getByText("Marker-only harness check"));
    await fireEvent.press(screen.getByText("Start run"));

    expect(screen.getByText("Starting in 3s")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("Starting in 2s")).toBeOnTheScreen();
  });

  it("shows time remaining while recording so a live run never looks frozen", async () => {
    await render(<HarnessApp buildCommit="abc123" store={new HarnessRunStore(memoryStorage())} />);

    await fireEvent.press(screen.getByText("Marker-only harness check"));
    await fireEvent.press(screen.getByText("Start run"));
    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });

    expect(screen.getByText("0:30 left")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(screen.getByText("0:25 left")).toBeOnTheScreen();
  });

  it("confirms a marker press on the button itself", async () => {
    await render(<HarnessApp buildCommit="abc123" store={new HarnessRunStore(memoryStorage())} />);

    await fireEvent.press(screen.getByText("Marker-only harness check"));
    await fireEvent.press(screen.getByText("Start run"));
    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });

    expect(screen.getAllByText("not yet pressed")).toHaveLength(2);
    await fireEvent.press(screen.getByText("I started"));

    expect(screen.getByText("recorded at 0:00")).toBeOnTheScreen();
  });

  it("describes each task in plain words instead of an internal kind", async () => {
    await render(<HarnessApp buildCommit="abc123" store={new HarnessRunStore(memoryStorage())} />);

    expect(screen.queryByText("declare-truth")).not.toBeOnTheScreen();
    expect(screen.getByText("30 seconds · 2 buttons to press")).toBeOnTheScreen();
  });
});

describe("HarnessApp launch url", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });
  afterEach(() => jest.useRealTimers());

  it("opens the named task and starts it when the url says start=1", async () => {
    await render(
      <HarnessApp
        buildCommit="abc123"
        launchUrl="excerlock://?test=marker-only&start=1"
        sources={{}}
        store={new HarnessRunStore(memoryStorage())}
      />,
    );
    await act(async () => undefined);
    expect(screen.getByText("Marker-only harness check")).toBeOnTheScreen();
    expect(screen.getByText("Countdown")).toBeOnTheScreen();
  });

  it("ignores a url that names no known task", async () => {
    await render(
      <HarnessApp
        buildCommit="abc123"
        launchUrl="excerlock://?test=bogus&start=1"
        sources={{}}
        store={new HarnessRunStore(memoryStorage())}
      />,
    );
    await act(async () => undefined);
    expect(screen.queryByText("Countdown")).toBeNull();
  });
});

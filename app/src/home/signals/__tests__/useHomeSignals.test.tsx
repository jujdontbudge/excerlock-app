import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import type { HomeSignalFeed } from "../homeSignalFeed";
import { useHomeSignals } from "../useHomeSignals";

describe("useHomeSignals", () => {
  afterEach(() => jest.restoreAllMocks());

  it("finishes feed startup before the claim-on-open read", async () => {
    const calls: string[] = [];
    const feed: HomeSignalFeed = {
      async start() {
        calls.push("start");
      },
      async read() {
        calls.push("read");
        return { totals: { steps: 123 }, activeSignals: [] };
      },
      subscribe: () => () => undefined,
      dispose: () => undefined,
    };

    const { result } = await renderHook(() => useHomeSignals(feed));

    await waitFor(() => expect(result.current.totals.steps).toBe(123));
    expect(calls.slice(0, 2)).toEqual(["start", "read"]);
  });

  it("claims again when the app returns to the foreground", async () => {
    let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockImplementation(
      (_event, listener) => {
        onAppStateChange = listener;
        return { remove };
      },
    );
    let reads = 0;
    let starts = 0;
    const feed: HomeSignalFeed = {
      async start() {
        starts += 1;
      },
      async read() {
        reads += 1;
        return { totals: { steps: reads }, activeSignals: [] };
      },
      subscribe: () => () => undefined,
      dispose: () => undefined,
    };

    const { result, unmount } = await renderHook(() => useHomeSignals(feed));
    await waitFor(() => expect(result.current.totals.steps).toBe(1));

    await act(async () => onAppStateChange?.("active"));

    await waitFor(() => expect(result.current.totals.steps).toBe(2));
    expect(starts).toBe(1);
    expect(reads).toBe(2);
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

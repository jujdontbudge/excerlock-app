import { renderHook, waitFor } from "@testing-library/react-native";

import type { HomeSignalFeed } from "../homeSignalFeed";
import { useHomeSignals } from "../useHomeSignals";

describe("useHomeSignals", () => {
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
});

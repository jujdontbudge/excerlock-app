import { renderHook } from "@testing-library/react-native";

import { useTimedExperimentVariant } from "../useTimedExperimentVariant";

describe("ExperimentVariantProvider timing", () => {
  it("renders control first, then accepts an on-time server-selected variant", async () => {
    let now = 1_000;
    const { result, rerender } = await renderHook(
      ({ observed }: { observed: unknown }) =>
        useTimedExperimentVariant(
          "exp-shield-copy-v1",
          observed,
          () => now,
        ),
      { initialProps: { observed: undefined } },
    );

    expect(result.current).toBe("control");

    now = 1_499;
    await rerender({ observed: "treatment" });

    expect(result.current).toBe("treatment");
  });
});

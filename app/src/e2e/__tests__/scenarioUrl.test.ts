import { matchScenarioDeepLink } from "../scenarioUrl";

describe("scenario deep-link URL matching", () => {
  // Observed on the iOS simulator 2026-07-30: the same link arrives as
  // `excerlock://e2e/scenario/x` from a warm `onURLReceived` event but as
  // `excerlock:///e2e/scenario/x` when it cold-launches the app and is read
  // back through `getLinkingURL()`. A raw `startsWith("excerlock://e2e/...")`
  // silently missed the second form, so every flow fell through to Expo
  // Router and landed on Unmatched Route.
  it.each([
    ["warm two-slash form", "excerlock://e2e/scenario/baseline-fresh-install"],
    ["cold three-slash form", "excerlock:///e2e/scenario/baseline-fresh-install"],
  ])("selects the same scenario from the %s", (_label, url) => {
    expect(matchScenarioDeepLink(url)).toBe("baseline-fresh-install");
  });

  it("keeps the query string so overrides survive", () => {
    expect(
      matchScenarioDeepLink("excerlock:///e2e/scenario/name?overrides=%7B%7D"),
    ).toBe("name?overrides=%7B%7D");
  });

  it("does not match a look-alike host", () => {
    expect(
      matchScenarioDeepLink("excerlock://other/e2e/scenario/name"),
    ).toBeNull();
  });

  it("does not match another scheme or a null url", () => {
    expect(matchScenarioDeepLink("other://e2e/scenario/name")).toBeNull();
    expect(matchScenarioDeepLink(null)).toBeNull();
  });

  it("does not match the prefix without a scenario name", () => {
    expect(matchScenarioDeepLink("excerlock://e2e/scenario/")).toBeNull();
  });
});

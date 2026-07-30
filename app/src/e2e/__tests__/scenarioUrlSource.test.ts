import { pickScenarioUrl } from "../scenarioUrlSource";

describe("choosing between linking URL sources", () => {
  // Observed on the simulator 2026-07-30: a cold `simctl openurl` reaches the
  // app (FrontBoard logs `UIOpenURLAction` in scene-create) and Expo Router
  // navigates from it, but `useLinkingURL()` -- backed by the Expo module --
  // left the gate with nothing, so every flow fell through to Unmatched Route.
  // Expo Router reads React Native's Linking, so the gate now watches both and
  // takes whichever one is actually carrying the scenario.
  it("takes the scenario link from whichever source has it", () => {
    expect(
      pickScenarioUrl([null, "excerlock:///e2e/scenario/baseline-fresh-install"]),
    ).toBe("excerlock:///e2e/scenario/baseline-fresh-install");
    expect(
      pickScenarioUrl(["excerlock://e2e/scenario/x", null]),
    ).toBe("excerlock://e2e/scenario/x");
  });

  it("prefers the first source when both carry a scenario", () => {
    expect(
      pickScenarioUrl([
        "excerlock://e2e/scenario/first",
        "excerlock://e2e/scenario/second",
      ]),
    ).toBe("excerlock://e2e/scenario/first");
  });

  it("ignores non-scenario URLs rather than passing them through", () => {
    // A non-scenario link must not be mistaken for one: the gate would stand
    // down for a URL it cannot load, which is the failure this replaces.
    expect(pickScenarioUrl(["excerlock://settings", null])).toBeNull();
    expect(pickScenarioUrl([null, null])).toBeNull();
    expect(pickScenarioUrl([])).toBeNull();
  });

  it("skips a non-scenario source to reach a later scenario one", () => {
    expect(
      pickScenarioUrl(["excerlock://settings", "excerlock://e2e/scenario/x"]),
    ).toBe("excerlock://e2e/scenario/x");
  });
});

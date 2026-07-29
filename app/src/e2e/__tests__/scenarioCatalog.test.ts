import { getScenarioManifest, SCENARIO_NAMES } from "..";

describe("bundled E2E scenario catalog", () => {
  it("ships the scenario selected by the smoke-home flow", () => {
    expect(SCENARIO_NAMES).toEqual(["baseline-fresh-install"]);

    expect(getScenarioManifest("baseline-fresh-install")).toMatchObject({
      name: "baseline-fresh-install",
      clock: {
        now: "2026-07-29T09:41:00-04:00",
        playback: "manual",
      },
      providers: {
        health: { fixture: "background-wake-replay" },
        motion: { fixture: "steady-walk" },
        location: { fixture: "quiet" },
        screentime: { fixture: "tick-ladder-basic" },
        vendor: { fixture: "none-connected" },
      },
    });
  });

  it("rejects unknown scenario names instead of falling back", () => {
    expect(() => getScenarioManifest("not-bundled")).toThrow(
      'Unknown E2E scenario "not-bundled"',
    );
  });
});

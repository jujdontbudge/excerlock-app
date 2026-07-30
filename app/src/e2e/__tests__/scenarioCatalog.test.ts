jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  getScenarioManifest,
  parseScenarioManifest,
  SCENARIO_NAMES,
} from "..";

const validManifest = () =>
  JSON.parse(
    JSON.stringify(getScenarioManifest("baseline-fresh-install")),
  ) as Record<string, unknown>;

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

  it.each([
    [
      "filename/name mismatch",
      () => ({ ...validManifest(), name: "another-story" }),
      "must match filename",
    ],
    [
      "invalid version",
      () => ({ ...validManifest(), version: 0 }),
      "version",
    ],
    [
      "unpinned clock",
      () => ({
        ...validManifest(),
        clock: { now: "tomorrow", playback: "manual" },
      }),
      "clock.now",
    ],
    [
      "incomplete vendor state",
      () => ({
        ...validManifest(),
        state: {
          ...(validManifest().state as Record<string, unknown>),
          vendors: { strava: "disconnected" },
        },
      }),
      "state.vendors",
    ],
    [
      "unsorted local timeline",
      () => ({
        ...validManifest(),
        timeline: [
          { atMs: 10, event: "motion.authDenied", payload: {} },
          { atMs: 0, event: "motion.authDenied", payload: {} },
        ],
      }),
      "timeline",
    ],
  ])("rejects %s", (_label, manifest, message) => {
    expect(() =>
      parseScenarioManifest("baseline-fresh-install", manifest()),
    ).toThrow(message);
  });
});

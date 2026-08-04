jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { remainingMinutes } from "@excerlock/ledger";

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
    expect(SCENARIO_NAMES).toEqual([
      "baseline-fresh-install",
      "balance-drain",
      "screentime-permission",
    ]);

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

  it("ships a drained-balance story whose allowance is actually empty", () => {
    const scenario = getScenarioManifest("balance-drain");
    const atMs = Date.parse(scenario.clock.now);

    expect(scenario.state.ledger.baseAllowanceMinutes).toBeGreaterThan(0);
    expect(
      remainingMinutes(
        { entries: scenario.state.ledger.journal },
        {
          baseAllowanceMinutes: scenario.state.ledger.baseAllowanceMinutes,
          dayBoundaryOffsetMinutes: 0,
          rollover: null,
        },
        atMs,
      ),
    ).toBe(0);
  });

  it("keeps every existing scenario on the mock OS boundary by default", () => {
    // Every #77 flow was written against MockScreenTimeModule semantics
    // (authorization approves instantly). Only a scenario that says
    // "native" opts into the real FamilyControls surface.
    expect(
      getScenarioManifest("baseline-fresh-install").state.shield
        .screenTimeModule,
    ).toBeUndefined();
    expect(
      getScenarioManifest("screentime-permission").state.shield
        .screenTimeModule,
    ).toBe("native");
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
      "an unknown screen-time module choice",
      () => {
        const manifest = validManifest();
        const state = manifest.state as Record<string, unknown>;
        return {
          ...manifest,
          state: {
            ...state,
            shield: { armedMonitors: [], screenTimeModule: "real" },
          },
        };
      },
      "state.shield.screenTimeModule",
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

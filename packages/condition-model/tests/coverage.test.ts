import { describe, expect, it } from "vitest";

import { VENDOR_COVERAGE, VENDOR_SIGNALS } from "../index";

describe("Tier-1 vendor coverage", () => {
  it("records every promoted, weak, and impossible picker cell", () => {
    expect(VENDOR_SIGNALS).toEqual([
      "steps",
      "runDistance",
      "cycleDistance",
      "swimDistance",
      "activeCalories",
      "activeMinutes",
      "workoutDuration",
      "whoopStrain",
    ]);

    expect(
      Object.fromEntries(
        Object.entries(VENDOR_COVERAGE).map(([vendor, cells]) => [
          vendor,
          Object.fromEntries(
            Object.entries(cells).map(([signal, cell]) => [
              signal,
              cell.status,
            ]),
          ),
        ]),
      ),
    ).toEqual({
      strava: {
        steps: "impossible",
        runDistance: "promoted",
        cycleDistance: "promoted",
        swimDistance: "promoted",
        activeCalories: "weak",
        activeMinutes: "promoted",
        workoutDuration: "promoted",
        whoopStrain: "impossible",
      },
      oura: {
        steps: "promoted",
        runDistance: "weak",
        cycleDistance: "weak",
        swimDistance: "weak",
        activeCalories: "promoted",
        activeMinutes: "promoted",
        workoutDuration: "promoted",
        whoopStrain: "impossible",
      },
      whoop: {
        steps: "impossible",
        runDistance: "weak",
        cycleDistance: "weak",
        swimDistance: "weak",
        activeCalories: "promoted",
        activeMinutes: "promoted",
        workoutDuration: "promoted",
        whoopStrain: "promoted",
      },
      polar: {
        steps: "promoted",
        runDistance: "promoted",
        cycleDistance: "promoted",
        swimDistance: "promoted",
        activeCalories: "promoted",
        activeMinutes: "promoted",
        workoutDuration: "promoted",
        whoopStrain: "impossible",
      },
    });
  });

  it("explains every non-promoted cell so the picker can render honest copy", () => {
    for (const cells of Object.values(VENDOR_COVERAGE)) {
      for (const cell of Object.values(cells)) {
        if (cell.status !== "promoted") {
          expect(cell.reason.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

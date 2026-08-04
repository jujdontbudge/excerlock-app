jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  getAnalysisClock,
  installAnalysisClock,
  systemAnalysisClock,
} from "../clock";

describe("analysis clock accessor", () => {
  it("returns the system clock until a scenario installs one", () => {
    expect(getAnalysisClock()).toBe(systemAnalysisClock);
  });

  it("lets a scenario install its own clock and restore the prior one", () => {
    const scenarioClock = { nowMs: () => 1_785_325_260_000 };

    const uninstall = installAnalysisClock(scenarioClock);
    expect(getAnalysisClock()).toBe(scenarioClock);

    uninstall();
    expect(getAnalysisClock()).toBe(systemAnalysisClock);
  });

  it("ignores a stale uninstall after a newer clock was installed", () => {
    const first = { nowMs: () => 1 };
    const second = { nowMs: () => 2 };

    const uninstallFirst = installAnalysisClock(first);
    const uninstallSecond = installAnalysisClock(second);

    uninstallFirst();
    expect(getAnalysisClock()).toBe(second);
    uninstallSecond();
  });
});

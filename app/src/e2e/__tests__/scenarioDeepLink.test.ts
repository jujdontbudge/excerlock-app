jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useHomeStore } from "@/home";

import { loadScenarioDeepLink } from "..";

describe("E2E scenario deep links", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("loads a bundled scenario with JSON merge-patch overrides", async () => {
    const overrides = encodeURIComponent(
      JSON.stringify({
        state: {
          entitlement: "free",
          ledger: { baseAllowanceMinutes: 30 },
        },
      }),
    );

    const loaded = await loadScenarioDeepLink(
      `excerlock://e2e/scenario/baseline-fresh-install?overrides=${overrides}`,
    );

    expect(loaded).not.toBeNull();
    expect(loaded?.manifest).toMatchObject({
      name: "baseline-fresh-install",
      state: {
        entitlement: "free",
        ledger: { baseAllowanceMinutes: 30, journal: [] },
      },
    });
    expect(
      useHomeStore.getState().ledgerConfig.baseAllowanceMinutes,
    ).toBe(30);

    loaded?.composition.dispose();
  });
});

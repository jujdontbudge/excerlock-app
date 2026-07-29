jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";
import {
  desiredOsState,
  remainingMinutes,
} from "@excerlock/ledger";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_HOME_STATE,
  useHomeStore,
} from "@/home";

import { MockAccountModule } from "../MockAccountModule";

describe("account local-first law", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("earns locally and lifts the core lock while signed out", async () => {
    const account = new MockAccountModule();
    expect((await account.getSnapshot()).session.status).toBe("signedOut");

    const condition: ConfiguredCondition = {
      id: "signed-out-core-path",
      catalogId: "steps-goal",
      source: "appleHealth",
      settings: {
        kind: "event",
        threshold: 10_000,
        reward: { type: "fixedMinutes", minutes: 30 },
        repeatable: false,
        perDayCap: null,
        cooldownMs: 0,
      },
    };
    const atMs = 12 * 60 * 60 * 1_000;

    useHomeStore.getState().addCondition(condition);
    useHomeStore.getState().recordEventPayout(condition.id, atMs);

    const { journal, ledgerConfig } = useHomeStore.getState();
    expect(remainingMinutes(journal, ledgerConfig, atMs)).toBe(30);
    expect(desiredOsState(journal, ledgerConfig, atMs).shields).toBe("down");
  });
});

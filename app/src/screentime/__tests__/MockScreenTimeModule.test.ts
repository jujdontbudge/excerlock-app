jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockScreenTimeModule } from "../MockScreenTimeModule";

describe("MockScreenTimeModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("moves authorization from not determined to one terminal decision", async () => {
    const denied = new MockScreenTimeModule();

    expect(await denied.getAuthorizationStatus()).toBe("notDetermined");
    denied.setNextAuthorizationResult("denied");
    await expect(denied.requestAuthorization()).resolves.toBe("denied");
    denied.setNextAuthorizationResult("approved");
    await expect(denied.requestAuthorization()).resolves.toBe("denied");

    await AsyncStorage.clear();
    const approved = new MockScreenTimeModule();
    approved.setNextAuthorizationResult("approved");

    await expect(approved.requestAuthorization()).resolves.toBe("approved");
    await expect(approved.getAuthorizationStatus()).resolves.toBe("approved");
  });
});

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getScreenTimeModule } from "..";

describe("ScreenTime composition seam", () => {
  it("returns one module instance from the Phase-3 swap point", () => {
    expect(getScreenTimeModule()).toBe(getScreenTimeModule());
  });
});

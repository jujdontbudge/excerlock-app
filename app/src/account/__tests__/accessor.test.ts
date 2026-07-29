jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getAccountModule } from "..";

describe("Account composition seam", () => {
  it("returns one module instance from the Phase-5 swap point", () => {
    expect(getAccountModule()).toBe(getAccountModule());
  });
});

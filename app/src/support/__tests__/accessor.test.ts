jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getSupportModule } from "..";

describe("Support composition seam", () => {
  it("returns one module instance from the HTTP-adapter swap point", () => {
    expect(getSupportModule()).toBe(getSupportModule());
  });
});

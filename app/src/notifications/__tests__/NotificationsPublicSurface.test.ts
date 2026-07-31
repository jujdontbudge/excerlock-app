jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-notifications", () => {
  throw new Error("The notifications public surface loaded its native adapter eagerly");
});

describe("notifications public surface", () => {
  it("does not initialize expo-notifications when consumers import the module", () => {
    expect(() => {
      jest.isolateModules(() => {
        require("../index");
      });
    }).not.toThrow();
  });
});

import { getShareCardModule } from "..";
import { NativeShareCardModule } from "../NativeShareCardModule";

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(),
}));

describe("share-card composition seam", () => {
  it("composes the production native adapter", () => {
    expect(getShareCardModule()).toBeInstanceOf(NativeShareCardModule);
  });

  it("reuses one adapter instance", () => {
    expect(getShareCardModule()).toBe(getShareCardModule());
  });
});

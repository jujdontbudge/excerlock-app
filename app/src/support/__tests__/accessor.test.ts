jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSupportModule } from "..";

describe("Support composition seam", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
    jest.restoreAllMocks();
  });

  it("uses the configured HTTP server by default", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.test/";
    const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      status: 201,
      json: async () => ({ submissionId: "server-submission-default" }),
    } as Response);

    await expect(
      getSupportModule().submitSupport({ message: "Use the real route." }),
    ).resolves.toEqual({
      status: "submitted",
      submissionId: "server-submission-default",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/support",
      expect.objectContaining({
        body: JSON.stringify({
          category: "support",
          message: "Use the real route.",
        }),
        method: "POST",
      }),
    );
  });

  it("returns one module instance from the HTTP-adapter swap point", () => {
    expect(getSupportModule()).toBe(getSupportModule());
  });
});

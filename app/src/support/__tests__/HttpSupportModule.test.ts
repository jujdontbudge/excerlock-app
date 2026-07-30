jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { ManualSupportClock } from "../clock";
import { HttpSupportModule } from "../HttpSupportModule";

describe("HttpSupportModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("submits support through the authenticated server route", async () => {
    const fetch = jest.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ submissionId: "server-submission-1" }),
    });
    const support = new HttpSupportModule({
      baseUrl: "https://api.example.test/",
      clock: new ManualSupportClock(1_000),
      fetch,
      getAccessToken: async () => "clerk-jwt",
    });

    await expect(
      support.submitSupport({
        message: "My workout did not unlock my apps.",
      }),
    ).resolves.toEqual({
      status: "submitted",
      submissionId: "server-submission-1",
    });

    expect(fetch).toHaveBeenCalledWith("https://api.example.test/v1/support", {
      body: JSON.stringify({
        category: "support",
        message: "My workout did not unlock my apps.",
      }),
      headers: {
        Accept: "application/json",
        Authorization: "Bearer clerk-jwt",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: expect.any(Object),
    });
    expect((await support.getSnapshot()).submissions).toEqual([
      {
        id: "server-submission-1",
        kind: "support",
        title: null,
        message: "My workout did not unlock my apps.",
        createdAtMs: 1_000,
        status: "submitted",
        error: null,
      },
    ]);
  });
});

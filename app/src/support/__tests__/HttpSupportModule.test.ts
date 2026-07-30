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

  it("saves an offline request and reports that it was not sent", async () => {
    const support = new HttpSupportModule({
      baseUrl: "https://api.example.test",
      clock: new ManualSupportClock(2_000),
      fetch: jest
        .fn()
        .mockRejectedValue(new TypeError("Network request failed")),
      getAccessToken: async () => "clerk-jwt",
    });

    await expect(
      support.submitSupport({ message: "Please keep this request." }),
    ).resolves.toEqual({
      status: "failed",
      submissionId: "local-support-2000-1",
      error: {
        code: "offline",
        message:
          "You're offline. This wasn't sent. It is saved here so you can try again.",
      },
    });
    expect((await support.getSnapshot()).submissions[0]).toEqual({
      id: "local-support-2000-1",
      kind: "support",
      title: null,
      message: "Please keep this request.",
      createdAtMs: 2_000,
      status: "failed",
      error: {
        code: "offline",
        message:
          "You're offline. This wasn't sent. It is saved here so you can try again.",
      },
    });
  });
});

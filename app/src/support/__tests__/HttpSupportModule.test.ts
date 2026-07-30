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

  it("times out a hung request instead of leaving it sending", async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest.fn(
        (
          _url: string,
          { signal }: Readonly<{ signal: AbortSignal }>,
        ) =>
          new Promise<never>((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            });
          }),
      );
      const support = new HttpSupportModule({
        baseUrl: "https://api.example.test",
        clock: new ManualSupportClock(3_000),
        fetch,
        getAccessToken: async () => "clerk-jwt",
        requestTimeoutMs: 25,
      });

      const result = support.submitSupport({
        message: "Do not leave this on a spinner.",
      });
      await jest.advanceTimersByTimeAsync(25);

      await expect(result).resolves.toEqual({
        status: "failed",
        submissionId: "local-support-3000-1",
        error: {
          code: "timeout",
          message:
            "The request timed out. This wasn't sent. It is saved here so you can try again.",
        },
      });
      expect((await support.getSnapshot()).submissions[0]).toMatchObject({
        status: "failed",
        error: { code: "timeout" },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps a request retryable when the server is unavailable", async () => {
    const support = new HttpSupportModule({
      baseUrl: "https://api.example.test",
      clock: new ManualSupportClock(4_000),
      fetch: jest.fn().mockResolvedValue({
        status: 503,
        json: async () => ({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database unavailable",
          },
        }),
      }),
      getAccessToken: async () => "clerk-jwt",
    });

    await expect(
      support.submitSupport({ message: "Please retry this later." }),
    ).resolves.toEqual({
      status: "failed",
      submissionId: "local-support-4000-1",
      error: {
        code: "service_unavailable",
        message:
          "Support is temporarily unavailable. This wasn't sent. It is saved here so you can try again.",
      },
    });
    expect((await support.getSnapshot()).submissions[0]).toMatchObject({
      status: "failed",
      error: { code: "service_unavailable" },
    });
  });
});

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { ManualSupportClock } from "../clock";
import { MockSupportModule } from "../MockSupportModule";
import type { SupportModule } from "../SupportModule";

describe("MockSupportModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("records a successfully submitted support request", async () => {
    const support: SupportModule = new MockSupportModule({
      clock: new ManualSupportClock(1_000),
    });

    await expect(
      support.submitSupport({ message: "My workout did not unlock my apps." }),
    ).resolves.toEqual({
      status: "submitted",
      submissionId: "support-1",
    });

    expect((await support.getSnapshot()).submissions).toEqual([
      {
        id: "support-1",
        kind: "support",
        title: null,
        message: "My workout did not unlock my apps.",
        createdAtMs: 1_000,
        status: "submitted",
        error: null,
      },
    ]);
  });

  it("keeps a failed support request with the truthful failure reason", async () => {
    const mock = new MockSupportModule({
      clock: new ManualSupportClock(2_000),
    });
    const support: SupportModule = mock;
    mock.setNextSubmissionResult({
      status: "failed",
      code: "service_unavailable",
      message: "Support is temporarily unavailable. This was not sent.",
    });

    await expect(
      support.submitSupport({ message: "Please help with my balance." }),
    ).resolves.toEqual({
      status: "failed",
      submissionId: "support-1",
      error: {
        code: "service_unavailable",
        message: "Support is temporarily unavailable. This was not sent.",
      },
    });

    expect((await support.getSnapshot()).submissions).toEqual([
      {
        id: "support-1",
        kind: "support",
        title: null,
        message: "Please help with my balance.",
        createdAtMs: 2_000,
        status: "failed",
        error: {
          code: "service_unavailable",
          message: "Support is temporarily unavailable. This was not sent.",
        },
      },
    ]);
  });

  it("saves an offline request as failed until the user explicitly retries it", async () => {
    const mock = new MockSupportModule({
      clock: new ManualSupportClock(3_000),
    });
    const support: SupportModule = mock;
    mock.setOnline(false);

    await expect(
      support.submitSupport({ message: "My permission status looks wrong." }),
    ).resolves.toEqual({
      status: "failed",
      submissionId: "support-1",
      error: {
        code: "offline",
        message:
          "You're offline. This wasn't sent. It is saved here so you can try again.",
      },
    });
    expect((await support.getSnapshot()).submissions[0]).toMatchObject({
      id: "support-1",
      status: "failed",
      error: { code: "offline" },
    });

    mock.setOnline(true);
    await expect(support.retrySubmission("support-1")).resolves.toEqual({
      status: "submitted",
      submissionId: "support-1",
    });
    expect((await support.getSnapshot()).submissions).toEqual([
      {
        id: "support-1",
        kind: "support",
        title: null,
        message: "My permission status looks wrong.",
        createdAtMs: 3_000,
        status: "submitted",
        error: null,
      },
    ]);
  });

  it("submits a feature request and exposes its submission state", async () => {
    const support: SupportModule = new MockSupportModule({
      clock: new ManualSupportClock(4_000),
    });

    await expect(
      support.submitFeatureRequest({
        title: "Apple Watch complication",
        message: "Show today's balance on my watch face.",
      }),
    ).resolves.toEqual({
      status: "submitted",
      submissionId: "feature-1",
    });

    expect(await support.getSnapshot()).toEqual({
      submissions: [
        {
          id: "feature-1",
          kind: "feature",
          title: "Apple Watch complication",
          message: "Show today's balance on my watch face.",
          createdAtMs: 4_000,
          status: "submitted",
          error: null,
        },
      ],
      featureRequests: [
        {
          id: "feature-1",
          title: "Apple Watch complication",
          message: "Show today's balance on my watch face.",
          voteCount: 0,
          hasVoted: false,
          submissionId: "feature-1",
        },
      ],
    });
  });
});

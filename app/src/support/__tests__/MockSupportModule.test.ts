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
});

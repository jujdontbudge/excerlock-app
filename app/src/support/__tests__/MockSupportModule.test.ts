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
});

import { describe, expect, it, vi } from "vitest";
import {
  createSupportSubmissionService,
  type NewSupportSubmissionRecord,
  type SupportSubmissionRepository,
  SupportUserNotFoundError,
} from "../src/support/index.js";

class MemorySupportSubmissionRepository
  implements SupportSubmissionRepository
{
  readonly submissions: NewSupportSubmissionRecord[] = [];

  async userExists(userId: string): Promise<boolean> {
    return userId === "user_123";
  }

  async insertSupportSubmission(
    submission: NewSupportSubmissionRecord,
  ): Promise<void> {
    this.submissions.push(submission);
  }
}

describe("support submission service", () => {
  it("persists a support request before emitting its server-owned event", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const supportRequestSubmitted = vi.fn();
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted },
      now: () => new Date("2026-07-29T21:00:00.000Z"),
      randomId: () => "support-request-id",
    });

    await expect(
      service.submit("user_123", {
        category: "support",
        message: "My workout did not unlock my apps.",
      }),
    ).resolves.toEqual({ submissionId: "support-request-id" });

    expect(repository.submissions).toEqual([
      {
        id: "support-request-id",
        userId: "user_123",
        category: "support",
        title: null,
        message: "My workout did not unlock my apps.",
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
      },
    ]);
    expect(supportRequestSubmitted.mock.calls).toEqual([
      ["user_123", "support"],
    ]);
  });

  it("stores an idea as one titled request, with nothing to vote on", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted: vi.fn() },
      now: () => new Date("2026-07-29T21:00:00.000Z"),
      randomId: () => "support-request-id",
    });

    await expect(
      service.submit("user_123", {
        category: "feature",
        title: "Home Screen widget",
        message: "Show my streak without opening the app.",
      }),
    ).resolves.toEqual({ submissionId: "support-request-id" });

    expect(repository.submissions).toEqual([
      {
        id: "support-request-id",
        userId: "user_123",
        category: "feature",
        title: "Home Screen widget",
        message: "Show my streak without opening the app.",
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
      },
    ]);
  });

  it("rejects an unknown user without persisting or emitting", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const supportRequestSubmitted = vi.fn();
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted },
    });

    await expect(
      service.submit("missing_user", {
        category: "bug",
        message: "Permission status is wrong.",
      }),
    ).rejects.toBeInstanceOf(SupportUserNotFoundError);

    expect({
      submissions: repository.submissions,
      events: supportRequestSubmitted.mock.calls,
    }).toEqual({ submissions: [], events: [] });
  });
});

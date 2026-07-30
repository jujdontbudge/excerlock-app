import { describe, expect, it, vi } from "vitest";
import {
  createFeatureRequestService,
  createSupportSubmissionService,
  type FeatureRequestRecord,
  type FeatureRequestRepository,
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

class MemoryFeatureRequestRepository implements FeatureRequestRepository {
  constructor(
    private readonly featureRequests: readonly FeatureRequestRecord[],
  ) {}

  async userExists(userId: string): Promise<boolean> {
    return userId === "user_123";
  }

  async listFeatureRequests(): Promise<readonly FeatureRequestRecord[]> {
    return this.featureRequests;
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
    ).resolves.toEqual({
      submissionId: "support-request-id",
    });

    expect(repository.submissions).toEqual([
      {
        id: "support-request-id",
        userId: "user_123",
        category: "support",
        title: null,
        message: "My workout did not unlock my apps.",
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
        featureRequest: null,
      },
    ]);
    expect(supportRequestSubmitted.mock.calls).toEqual([
      ["user_123", "support"],
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
    ).rejects.toEqual(new SupportUserNotFoundError("missing_user"));
    expect(repository.submissions).toEqual([]);
    expect(supportRequestSubmitted).not.toHaveBeenCalled();
  });
});

describe("feature request service", () => {
  it("lists feature requests with the current user's vote state", async () => {
    const repository = new MemoryFeatureRequestRepository([
      {
        id: "feature-request-id",
        submissionId: "support-request-id",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        voteCount: 3,
        hasVoted: true,
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
      },
    ]);
    const service = createFeatureRequestService({ repository });

    await expect(service.list("user_123")).resolves.toEqual({
      featureRequests: [
        {
          id: "feature-request-id",
          submissionId: "support-request-id",
          title: "Home Screen widget",
          message: "Show my balance without opening the app.",
          voteCount: 3,
          hasVoted: true,
          createdAt: new Date("2026-07-29T21:00:00.000Z"),
        },
      ],
    });
  });
});

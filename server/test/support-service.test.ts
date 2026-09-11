import { describe, expect, it, vi } from "vitest";
import {
  createFeatureRequestService,
  createFeatureRequestVoteService,
  createSupportSubmissionService,
  FeatureRequestNotFoundError,
  type FeatureRequestRecord,
  type FeatureRequestRepository,
  type FeatureRequestVoteRepository,
  type NewFeatureRequestVoteRecord,
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

class MemoryFeatureRequestVoteRepository
  implements FeatureRequestVoteRepository
{
  readonly votes: NewFeatureRequestVoteRecord[] = [];
  private readonly uniquenessKeys = new Set<string>();

  async userExists(userId: string): Promise<boolean> {
    return userId === "user_123";
  }

  async recordFeatureRequestVote(vote: NewFeatureRequestVoteRecord) {
    if (vote.featureRequestId !== "feature-request-id") {
      return null;
    }

    const uniquenessKey = `${vote.featureRequestId}:${vote.userId}`;
    if (this.uniquenessKeys.has(uniquenessKey)) {
      return { status: "alreadyVoted" as const, voteCount: 1 };
    }

    this.uniquenessKeys.add(uniquenessKey);
    this.votes.push(vote);
    return { status: "voted" as const, voteCount: 1 };
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

  it("persists a feature submission and emits one feature-category event", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const supportRequestSubmitted = vi.fn();
    const ids = ["support-request-id", "feature-request-id"][
      Symbol.iterator
    ]();
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted },
      now: () => new Date("2026-07-29T21:00:00.000Z"),
      randomId: () => ids.next().value!,
    });

    await expect(
      service.submit("user_123", {
        category: "feature",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
      }),
    ).resolves.toEqual({
      submissionId: "support-request-id",
      featureRequestId: "feature-request-id",
    });
    expect(repository.submissions[0]).toMatchObject({
      id: "support-request-id",
      category: "feature",
      featureRequest: {
        id: "feature-request-id",
        title: "Home Screen widget",
      },
    });
    expect(supportRequestSubmitted.mock.calls).toEqual([
      ["user_123", "feature"],
    ]);
  });

  it("does not emit analytics when persistence fails", async () => {
    const supportRequestSubmitted = vi.fn();
    const repository: SupportSubmissionRepository = {
      userExists: vi.fn(async () => true),
      insertSupportSubmission: vi.fn(async () => {
        throw new Error("database unavailable");
      }),
    };
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted },
    });

    await expect(
      service.submit("user_123", {
        category: "support",
        message: "Please help with my balance.",
      }),
    ).rejects.toThrow("database unavailable");
    expect(supportRequestSubmitted).not.toHaveBeenCalled();
  });

  it("invokes notify once after persist and analytics", async () => {
    const order: string[] = [];
    const repository: SupportSubmissionRepository = {
      async userExists() {
        return true;
      },
      async insertSupportSubmission() {
        order.push("insert");
      },
    };
    const supportRequestSubmitted = vi.fn(() => {
      order.push("analytics");
    });
    const notify = vi.fn(async () => {
      order.push("notify");
      return true;
    });
    const createdAt = new Date("2026-07-29T21:00:00.000Z");
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted },
      notify,
      now: () => createdAt,
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
    expect(order).toEqual(["insert", "analytics", "notify"]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      id: "support-request-id",
      userId: "user_123",
      category: "support",
      title: null,
      message: "My workout did not unlock my apps.",
      createdAt,
      featureRequest: null,
    });
  });

  it("still resolves the submission when notify rejects", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const notify = vi.fn(async () => {
      throw new Error("resend unavailable");
    });
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted: vi.fn() },
      notify,
      randomId: () => "support-request-id",
    });

    await expect(
      service.submit("user_123", {
        category: "bug",
        message: "Permission status is wrong.",
      }),
    ).resolves.toEqual({
      submissionId: "support-request-id",
    });
    expect(repository.submissions).toHaveLength(1);
    expect(notify).toHaveBeenCalledTimes(1);
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

  it("records one vote and treats a retry as an idempotent no-op", async () => {
    const repository = new MemoryFeatureRequestVoteRepository();
    const ids = ["vote-1", "vote-retry"][Symbol.iterator]();
    const service = createFeatureRequestVoteService({
      repository,
      now: () => new Date("2026-07-29T21:05:00.000Z"),
      randomId: () => ids.next().value!,
    });

    await expect(
      service.vote("user_123", "feature-request-id"),
    ).resolves.toEqual({
      status: "voted",
      featureRequestId: "feature-request-id",
      voteCount: 1,
    });
    await expect(
      service.vote("user_123", "feature-request-id"),
    ).resolves.toEqual({
      status: "alreadyVoted",
      featureRequestId: "feature-request-id",
      voteCount: 1,
    });
    expect(repository.votes).toEqual([
      {
        id: "vote-1",
        featureRequestId: "feature-request-id",
        userId: "user_123",
        createdAt: new Date("2026-07-29T21:05:00.000Z"),
      },
    ]);
  });

  it("rejects a vote for a nonexistent feature request", async () => {
    const repository = new MemoryFeatureRequestVoteRepository();
    const service = createFeatureRequestVoteService({ repository });

    await expect(
      service.vote("user_123", "missing-feature-request"),
    ).rejects.toEqual(
      new FeatureRequestNotFoundError("missing-feature-request"),
    );
    expect(repository.votes).toEqual([]);
  });
});

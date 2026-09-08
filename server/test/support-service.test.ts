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
        replyTo: null,
        diagnostics: null,
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
        replyTo: null,
        diagnostics: null,
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
      },
    ]);
  });

  it("maps the product categories onto the locked analytics enum", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const supportRequestSubmitted = vi.fn();
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted },
      now: () => new Date("2026-07-29T21:00:00.000Z"),
      randomId: () => "support-request-id",
    });

    for (const category of ["problem", "question", "idea"] as const) {
      await service.submit("user_123", { category, message: "Something." });
    }

    expect(repository.submissions.map((entry) => entry.category)).toEqual([
      "bug",
      "support",
      "feature",
    ]);
    expect(supportRequestSubmitted.mock.calls).toEqual([
      ["user_123", "bug"],
      ["user_123", "support"],
      ["user_123", "feature"],
    ]);
  });

  it("keeps the reply address and diagnostics the composer collected", async () => {
    const repository = new MemorySupportSubmissionRepository();
    const service = createSupportSubmissionService({
      repository,
      analytics: { supportRequestSubmitted: vi.fn() },
      now: () => new Date("2026-07-29T21:00:00.000Z"),
      randomId: () => "support-request-id",
    });

    const diagnostics = {
      appVersion: "1.4.0",
      appBuild: "412",
      iosVersion: "18.2",
      deviceModel: "iPhone15,3",
      entitlementStatus: "active",
      permissions: {
        screenTime: "granted",
        motion: "granted",
        location: "whenInUse",
        health: "notDetermined",
        camera: "denied",
        notifications: "granted",
      },
      ruleCount: 3,
      lastEnforcementResult: "shielded",
    } as const;

    await service.submit("user_123", {
      category: "problem",
      message: "Nothing unlocked after my walk.",
      replyTo: "someone@example.com",
      diagnostics,
    });

    expect(repository.submissions[0]).toMatchObject({
      category: "bug",
      replyTo: "someone@example.com",
      diagnostics,
    });
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

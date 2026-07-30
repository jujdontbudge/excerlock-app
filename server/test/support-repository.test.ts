import { describe, expect, it } from "vitest";
import { createDrizzleSupportSubmissionRepository } from "../src/support/index.js";
import { createPostgresJsTestDatabase } from "./postgresJsTestDatabase.js";

describe("support submission repository", () => {
  it("persists a feature submission and its list entry in one transaction", async () => {
    const database = createPostgresJsTestDatabase();
    const repository = createDrizzleSupportSubmissionRepository(
      database.db,
    );
    const createdAt = new Date("2026-07-29T21:00:00.000Z");

    await repository.insertSupportSubmission({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
      createdAt,
      featureRequest: {
        id: "feature-request-id",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        createdAt,
      },
    });

    expect({
      transactionCount: database.transactionCount,
      queries: database.queries,
    }).toEqual({
      transactionCount: 1,
      queries: [
        {
          sql: 'insert into "support_requests" ("id", "user_id", "category", "title", "message", "created_at") values ($1, $2, $3, $4, $5, $6)',
          params: [
            "support-request-id",
            "user_123",
            "feature",
            "Home Screen widget",
            "Show my balance without opening the app.",
            "2026-07-29T21:00:00.000Z",
          ],
        },
        {
          sql: 'insert into "feature_requests" ("id", "support_request_id", "title", "message", "created_at") values ($1, $2, $3, $4, $5)',
          params: [
            "feature-request-id",
            "support-request-id",
            "Home Screen widget",
            "Show my balance without opening the app.",
            "2026-07-29T21:00:00.000Z",
          ],
        },
      ],
    });
  });
});

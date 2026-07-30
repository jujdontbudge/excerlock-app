import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  featureRequests,
  supportRequests,
  users,
} from "../db/schema.js";
import type { SupportSubmissionRepository } from "./repository.js";

type SupportDatabase = NonNullable<ReturnType<typeof getDb>>;

function requireDatabase(
  database: SupportDatabase | null,
): SupportDatabase {
  if (!database) {
    throw new Error(
      "Support persistence is not configured; missing DATABASE_URL",
    );
  }
  return database;
}

export function createDrizzleSupportSubmissionRepository(
  configuredDatabase: SupportDatabase | null = getDb(),
): SupportSubmissionRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    async userExists(userId) {
      const [user] = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return user !== undefined;
    },

    async insertSupportSubmission(submission) {
      await database.transaction(async (transaction) => {
        await transaction.insert(supportRequests).values({
          id: submission.id,
          userId: submission.userId,
          category: submission.category,
          title: submission.title,
          message: submission.message,
          createdAt: submission.createdAt,
        });

        if (submission.featureRequest) {
          await transaction.insert(featureRequests).values({
            id: submission.featureRequest.id,
            supportRequestId: submission.id,
            title: submission.featureRequest.title,
            message: submission.featureRequest.message,
            createdAt: submission.featureRequest.createdAt,
          });
        }
      });
    },
  };
}

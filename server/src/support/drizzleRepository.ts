import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { getDb } from "../db/client.js";
import { supportRequests, users } from "../db/schema.js";
import type { SupportSubmissionRepository } from "./repository.js";

type SupportDatabase = PgDatabase<
  any,
  typeof import("../db/schema.js")
>;
type SupportTransaction = Parameters<
  Parameters<SupportDatabase["transaction"]>[0]
>[0];

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

async function userExists(
  database: SupportDatabase,
  userId: string,
): Promise<boolean> {
  const [user] = await database
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  return user !== undefined;
}

async function lockActiveUser(
  transaction: SupportTransaction,
  userId: string,
): Promise<void> {
  const [activeUser] = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1)
    .for("update");
  if (!activeUser) {
    throw new Error("User is deleted or missing");
  }
}

export function createDrizzleSupportSubmissionRepository(
  configuredDatabase: SupportDatabase | null = getDb(),
): SupportSubmissionRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    userExists: (userId) => userExists(database, userId),

    async insertSupportSubmission(submission) {
      await database.transaction(async (transaction) => {
        await lockActiveUser(transaction, submission.userId);

        await transaction.insert(supportRequests).values({
          id: submission.id,
          userId: submission.userId,
          category: submission.category,
          title: submission.title,
          message: submission.message,
          createdAt: submission.createdAt,
        });
      });
    },
  };
}

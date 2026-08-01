import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { getDb } from "../db/client.js";
import {
  featureRequestVotes,
  featureRequests,
  supportRequests,
  users,
} from "../db/schema.js";
import type {
  FeatureRequestRepository,
  FeatureRequestVoteRepository,
  SupportSubmissionRepository,
} from "./repository.js";

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

export function createDrizzleFeatureRequestVoteRepository(
  configuredDatabase: SupportDatabase | null = getDb(),
): FeatureRequestVoteRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    userExists: (userId) => userExists(database, userId),

    async recordFeatureRequestVote(vote) {
      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, vote.userId);
        const [featureRequest] = await transaction
          .select({ id: featureRequests.id })
          .from(featureRequests)
          .where(eq(featureRequests.id, vote.featureRequestId))
          .limit(1);
        if (!featureRequest) {
          return null;
        }

        const [inserted] = await transaction
          .insert(featureRequestVotes)
          .values(vote)
          .onConflictDoNothing({
            target: [
              featureRequestVotes.featureRequestId,
              featureRequestVotes.userId,
            ],
          })
          .returning({ id: featureRequestVotes.id });
        const [tally] = await transaction
          .select({ voteCount: count(featureRequestVotes.id) })
          .from(featureRequestVotes)
          .where(
            eq(
              featureRequestVotes.featureRequestId,
              vote.featureRequestId,
            ),
          );
        if (!tally) {
          throw new Error("Feature vote count query returned no row");
        }

        return {
          status: inserted ? "voted" : "alreadyVoted",
          voteCount: tally.voteCount,
        };
      });
    },
  };
}

export function createDrizzleFeatureRequestRepository(
  configuredDatabase: SupportDatabase | null = getDb(),
): FeatureRequestRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    userExists: (userId) => userExists(database, userId),

    async listFeatureRequests(userId) {
      return database
        .select({
          id: featureRequests.id,
          submissionId: featureRequests.supportRequestId,
          title: featureRequests.title,
          message: featureRequests.message,
          voteCount: count(featureRequestVotes.id),
          hasVoted: sql<boolean>`coalesce(bool_or(${featureRequestVotes.userId} = ${userId}), false)`,
          createdAt: featureRequests.createdAt,
        })
        .from(featureRequests)
        .leftJoin(
          featureRequestVotes,
          eq(
            featureRequestVotes.featureRequestId,
            featureRequests.id,
          ),
        )
        .groupBy(
          featureRequests.id,
          featureRequests.supportRequestId,
          featureRequests.title,
          featureRequests.message,
          featureRequests.createdAt,
        )
        .orderBy(
          desc(featureRequests.createdAt),
          desc(featureRequests.id),
        );
    },
  };
}

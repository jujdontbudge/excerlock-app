import { count, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  featureRequestVotes,
  featureRequests,
  supportRequests,
  users,
} from "../db/schema.js";
import type {
  FeatureRequestVoteRepository,
  SupportSubmissionRepository,
} from "./repository.js";

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

async function userExists(
  database: SupportDatabase,
  userId: string,
): Promise<boolean> {
  const [user] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user !== undefined;
}

export function createDrizzleSupportSubmissionRepository(
  configuredDatabase: SupportDatabase | null = getDb(),
): SupportSubmissionRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    userExists: (userId) => userExists(database, userId),

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

export function createDrizzleFeatureRequestVoteRepository(
  configuredDatabase: SupportDatabase | null = getDb(),
): FeatureRequestVoteRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    userExists: (userId) => userExists(database, userId),

    async recordFeatureRequestVote(vote) {
      return database.transaction(async (transaction) => {
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

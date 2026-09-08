import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  getDb,
  users,
  type DatabaseSchema,
} from "../db/index.js";
import {
  DeletedIdentityError,
  type IdentityRecord,
  type IdentityRepository,
} from "./repository.js";

type IdentityDatabase = PgDatabase<any, DatabaseSchema>;

function requireDatabase(
  database: IdentityDatabase | null,
): IdentityDatabase {
  if (!database) {
    throw new Error("Identity persistence is not configured; missing DATABASE_URL");
  }
  return database;
}

export function createDrizzleIdentityRepository(
  configuredDatabase: IdentityDatabase | null = getDb(),
): IdentityRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    async ensureActiveUser(userId) {
      await database.transaction(async (transaction) => {
        await transaction
          .insert(users)
          .values({ id: userId })
          .onConflictDoNothing();

        const [user] = await transaction
          .select({ deletedAt: users.deletedAt })
          .from(users)
          .where(eq(users.id, userId))
          .for("update")
          .limit(1);
        if (!user || user.deletedAt) {
          throw new DeletedIdentityError();
        }
      });
    },

    async findUser(userId): Promise<IdentityRecord | null> {
      const [user] = await database
        .select({ createdAt: users.createdAt, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return user ?? null;
    },
  };
}

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "../src/db/schema.js";
import {
  createDrizzleIdentityRepository,
  DeletedIdentityError,
} from "../src/identity/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

beforeAll(async () => {
  postgres = await createPgliteTestDatabase();
}, 30_000);

beforeEach(async () => {
  await postgres.reset();
}, 30_000);

afterAll(async () => {
  await postgres.client.close();
}, 30_000);

describe("identity provisioning", () => {
  it("creates one minimal active row across retries", async () => {
    const repository = createDrizzleIdentityRepository(postgres.db);

    await repository.ensureActiveUser("user_123");
    await repository.ensureActiveUser("user_123");

    expect(
      await postgres.db.select().from(users).where(eq(users.id, "user_123")),
    ).toEqual([
      expect.objectContaining({ id: "user_123", email: null, deletedAt: null }),
    ]);
  });

  it("never clears a deletion tombstone", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    await postgres.db.insert(users).values({ id: "user_123", deletedAt });
    const repository = createDrizzleIdentityRepository(postgres.db);

    await expect(repository.ensureActiveUser("user_123")).rejects.toBeInstanceOf(
      DeletedIdentityError,
    );
    expect(
      await postgres.db.select().from(users).where(eq(users.id, "user_123")),
    ).toEqual([expect.objectContaining({ deletedAt })]);
  });
});

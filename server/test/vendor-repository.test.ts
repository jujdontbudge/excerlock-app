import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { users } from "../src/db/schema.js";
import { createDrizzleVendorRepository } from "../src/vendors/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

beforeAll(async () => {
  postgres = await createPgliteTestDatabase();
});

beforeEach(async () => {
  await postgres.reset();
});

afterAll(async () => {
  await postgres.client.close();
});

describe("vendor repository configuration", () => {
  it("fails loudly on first persistence use without DATABASE_URL", () => {
    expect(() => createDrizzleVendorRepository(null)).toThrow(
      "Vendor persistence is not configured; missing DATABASE_URL",
    );
  });

  it("persists and atomically consumes an unexpired OAuth state once", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    const repository = createDrizzleVendorRepository(postgres.db);
    const state = {
      stateHash: "state-hash",
      userId: "user_123",
      vendor: "strava" as const,
      expiresAt: new Date("2026-07-29T21:10:00.000Z"),
    };

    await repository.saveOAuthState(state);

    await expect(
      repository.consumeOAuthState(
        state.stateHash,
        state.vendor,
        new Date("2026-07-29T21:00:00.000Z"),
      ),
    ).resolves.toEqual(state);
    await expect(
      repository.consumeOAuthState(
        state.stateHash,
        state.vendor,
        new Date("2026-07-29T21:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });
});

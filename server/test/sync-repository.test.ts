import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { rules, users } from "../src/db/schema.js";
import { DeletedIdentityError } from "../src/identity/index.js";
import {
  createDrizzleSyncRepository,
  type HistoryDayPayload,
  type RulePayload,
} from "../src/sync/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

const RULE_A = "11111111-1111-4111-8111-111111111111";
const RULE_B = "22222222-2222-4222-8222-222222222222";

beforeAll(async () => {
  postgres = await createPgliteTestDatabase();
});

beforeEach(async () => {
  await postgres.reset();
});

afterAll(async () => {
  await postgres.client.close();
});

function repository() {
  return createDrizzleSyncRepository(postgres.db);
}

function walkingRule(overrides: Partial<RulePayload> = {}): RulePayload {
  return {
    id: RULE_A,
    activity: "walking",
    mode: {
      kind: "target",
      activity: "walking",
      metric: "steps",
      goal: 5_000,
      place: "outside",
    },
    schedule: { days: [1, 2, 3, 4, 5], window: { kind: "allDay" } },
    enabled: true,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    ...overrides,
  } as RulePayload;
}

function gymRule(overrides: Partial<RulePayload> = {}): RulePayload {
  return walkingRule({
    id: RULE_B,
    activity: "gym",
    mode: { kind: "event", activity: "gym", trigger: "arrival" },
    ...overrides,
  });
}

function sealedDay(
  overrides: Partial<HistoryDayPayload> = {},
): HistoryDayPayload {
  return {
    day: "2026-09-01",
    usageMinutes: 92,
    activity: { walking: 5_200, gym: 0, running: 0, biking: 0 },
    met: true,
    scheduled: true,
    sealedAt: "2026-09-02T04:00:00.000Z",
    updatedAt: "2026-09-02T04:00:00.000Z",
    ...overrides,
  };
}

describe("rule sync", () => {
  it("provisions the identity row on the first push", async () => {
    const result = await repository().upsertRules("user_123", [walkingRule()]);

    expect({
      result,
      users: await postgres.db.select({ id: users.id }).from(users),
    }).toEqual({
      result: { applied: 1, skipped: 0 },
      users: [{ id: "user_123" }],
    });
  });

  it("keeps the newer row when an older push replays", async () => {
    const sync = repository();
    await sync.upsertRules("user_123", [
      walkingRule({ updatedAt: "2026-09-02T12:00:00.000Z", enabled: false }),
    ]);

    const replay = await sync.upsertRules("user_123", [
      walkingRule({ updatedAt: "2026-09-01T12:00:00.000Z", enabled: true }),
    ]);

    const snapshot = await sync.read("user_123");
    expect({
      replay,
      enabled: snapshot.rules[0]?.enabled,
      updatedAt: snapshot.rules[0]?.updatedAt,
    }).toEqual({
      replay: { applied: 0, skipped: 1 },
      enabled: false,
      updatedAt: "2026-09-02T12:00:00.000Z",
    });
  });

  it("applies a newer edit from a second device", async () => {
    const sync = repository();
    await sync.upsertRules("user_123", [walkingRule()]);

    const edit = await sync.upsertRules("user_123", [
      walkingRule({
        updatedAt: "2026-09-03T12:00:00.000Z",
        mode: {
          kind: "target",
          activity: "walking",
          metric: "steps",
          goal: 8_000,
          place: "either",
        },
      }),
    ]);

    const snapshot = await sync.read("user_123");
    expect({ edit, mode: snapshot.rules[0]?.mode }).toEqual({
      edit: { applied: 1, skipped: 0 },
      mode: {
        kind: "target",
        activity: "walking",
        metric: "steps",
        goal: 8_000,
        place: "either",
      },
    });
  });

  it("deletes a rule only when the device sends a tombstone", async () => {
    const sync = repository();
    await sync.upsertRules("user_123", [walkingRule(), gymRule()]);

    const deletion = await sync.upsertRules("user_123", [
      gymRule({
        updatedAt: "2026-09-04T12:00:00.000Z",
        deletedAt: "2026-09-04T12:00:00.000Z",
      }),
    ]);

    const snapshot = await sync.read("user_123");
    expect({
      deletion,
      live: snapshot.rules
        .filter((rule) => rule.deletedAt === null)
        .map((rule) => rule.id),
      tombstoned: snapshot.rules
        .filter((rule) => rule.deletedAt !== null)
        .map((rule) => rule.id),
    }).toEqual({
      deletion: { applied: 1, skipped: 0 },
      live: [RULE_A],
      tombstoned: [RULE_B],
    });
  });

  it("leaves a rule the batch never mentions alone", async () => {
    const sync = repository();
    await sync.upsertRules("phone", [walkingRule(), gymRule()]);

    // The watch has never heard of the gym rule, so it pushes only the one it
    // knows. Absence is not a deletion; the gym rule survives untouched.
    const partial = await sync.upsertRules("phone", [
      walkingRule({ updatedAt: "2026-09-05T12:00:00.000Z", enabled: false }),
    ]);

    const snapshot = await sync.read("phone");
    expect({
      partial,
      rules: snapshot.rules
        .map((rule) => ({ id: rule.id, deletedAt: rule.deletedAt }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    }).toEqual({
      partial: { applied: 1, skipped: 0 },
      rules: [
        { id: RULE_A, deletedAt: null },
        { id: RULE_B, deletedAt: null },
      ],
    });
  });

  it("treats an empty batch as nothing to say, not as a deletion", async () => {
    const sync = repository();
    await sync.upsertRules("user_123", [walkingRule()]);

    const empty = await sync.upsertRules("user_123", []);

    expect({
      empty,
      deleted: (await sync.read("user_123")).rules.map(
        (rule) => rule.deletedAt !== null,
      ),
    }).toEqual({ empty: { applied: 0, skipped: 0 }, deleted: [false] });
  });

  it("ignores a stale tombstone for a rule the user has since re-edited", async () => {
    const sync = repository();
    await sync.upsertRules("user_123", [
      walkingRule({ updatedAt: "2026-09-06T12:00:00.000Z" }),
    ]);

    const staleTombstone = await sync.upsertRules("user_123", [
      walkingRule({
        updatedAt: "2026-09-05T12:00:00.000Z",
        deletedAt: "2026-09-05T12:00:00.000Z",
      }),
    ]);

    expect({
      staleTombstone,
      deletedAt: (await sync.read("user_123")).rules[0]?.deletedAt,
    }).toEqual({ staleTombstone: { applied: 0, skipped: 1 }, deletedAt: null });
  });
});

describe("ownership", () => {
  it("never lets one account overwrite another account's rule", async () => {
    const sync = repository();
    await sync.upsertRules("owner", [walkingRule()]);

    const attacker = await sync.upsertRules("attacker", [
      walkingRule({
        updatedAt: "2027-01-01T00:00:00.000Z",
        enabled: false,
        mode: {
          kind: "target",
          activity: "walking",
          metric: "steps",
          goal: 30_000,
          place: "outside",
        },
      }),
    ]);

    const [stored] = await postgres.db
      .select({ userId: rules.userId, enabled: rules.enabled })
      .from(rules)
      .where(eq(rules.id, RULE_A));
    expect({
      attacker,
      stored,
      attackerSees: await sync.read("attacker"),
    }).toEqual({
      attacker: { applied: 0, skipped: 1 },
      stored: { userId: "owner", enabled: true },
      attackerSees: {
        rules: [],
        ruleDays: [],
        usageDays: [],
        earnedUnlocks: [],
        historyDays: [],
        profile: null,
      },
    });
  });

  it("never lets one account tombstone another account's rule", async () => {
    const sync = repository();
    await sync.upsertRules("owner", [walkingRule()]);
    await sync.upsertRuleDays("owner", [
      {
        ruleId: RULE_A,
        day: "2026-09-01",
        progress: 5_200,
        met: true,
        metAt: "2026-09-01T15:00:00.000Z",
        unit: "steps",
        updatedAt: "2026-09-01T15:00:00.000Z",
      },
    ]);

    await sync.upsertRules("attacker", [
      walkingRule({
        updatedAt: "2027-01-01T00:00:00.000Z",
        deletedAt: "2027-01-01T00:00:00.000Z",
      }),
    ]);

    const owner = await sync.read("owner");
    expect({
      ownerRules: owner.rules.map((rule) => ({
        id: rule.id,
        deletedAt: rule.deletedAt,
      })),
      ownerDays: owner.ruleDays.length,
    }).toEqual({
      ownerRules: [{ id: RULE_A, deletedAt: null }],
      ownerDays: 1,
    });
  });
});

describe("rule day, usage day and earned unlock sync", () => {
  it("round-trips a fractional distance without losing precision", async () => {
    const sync = repository();

    await sync.upsertRuleDays("user_123", [
      {
        ruleId: RULE_A,
        day: "2026-09-01",
        progress: 12.345,
        met: false,
        metAt: null,
        unit: "km",
        updatedAt: "2026-09-01T15:00:00.000Z",
      },
    ]);

    expect((await sync.read("user_123")).ruleDays).toEqual([
      {
        ruleId: RULE_A,
        day: "2026-09-01",
        progress: 12.345,
        met: false,
        metAt: null,
        unit: "km",
        updatedAt: "2026-09-01T15:00:00.000Z",
      },
    ]);
  });

  it("keeps a met day met when a stale unmet row replays", async () => {
    const sync = repository();
    const met = {
      ruleId: RULE_A,
      day: "2026-09-01",
      progress: 5_200,
      met: true,
      metAt: "2026-09-01T15:00:00.000Z",
      unit: "steps" as const,
      updatedAt: "2026-09-01T15:00:00.000Z",
    };
    await sync.upsertRuleDays("user_123", [met]);

    const stale = await sync.upsertRuleDays("user_123", [
      {
        ...met,
        progress: 100,
        met: false,
        metAt: null,
        updatedAt: "2026-09-01T09:00:00.000Z",
      },
    ]);

    expect({
      stale,
      stored: (await sync.read("user_123")).ruleDays,
    }).toEqual({ stale: { applied: 0, skipped: 1 }, stored: [met] });
  });

  it("upserts usage days and earned unlocks by their own updatedAt", async () => {
    const sync = repository();
    await sync.upsertUsageDays("user_123", [
      { day: "2026-09-01", lockedAppMinutes: 90, updatedAt: "2026-09-01T23:00:00.000Z" },
    ]);
    const staleUsage = await sync.upsertUsageDays("user_123", [
      { day: "2026-09-01", lockedAppMinutes: 10, updatedAt: "2026-09-01T09:00:00.000Z" },
    ]);
    await sync.upsertEarnedUnlocks("user_123", [
      {
        day: "2026-09-01",
        ruleId: RULE_A,
        ruleName: "5,000 steps",
        metAt: "2026-09-01T15:00:00.000Z",
        windowEnd: "2026-09-01T21:00:00.000Z",
        updatedAt: "2026-09-01T15:00:00.000Z",
      },
    ]);

    const snapshot = await sync.read("user_123");
    expect({
      staleUsage,
      usageDays: snapshot.usageDays,
      earnedUnlocks: snapshot.earnedUnlocks,
    }).toEqual({
      staleUsage: { applied: 0, skipped: 1 },
      usageDays: [
        { day: "2026-09-01", lockedAppMinutes: 90, updatedAt: "2026-09-01T23:00:00.000Z" },
      ],
      earnedUnlocks: [
        {
          day: "2026-09-01",
          ruleId: RULE_A,
          ruleName: "5,000 steps",
          metAt: "2026-09-01T15:00:00.000Z",
          windowEnd: "2026-09-01T21:00:00.000Z",
          updatedAt: "2026-09-01T15:00:00.000Z",
        },
      ],
    });
  });

  it("keeps an earned unlock after its rule is deleted (B23)", async () => {
    const sync = repository();
    await sync.upsertRules("user_123", [walkingRule()]);
    await sync.upsertEarnedUnlocks("user_123", [
      {
        day: "2026-09-01",
        ruleId: RULE_A,
        ruleName: "5,000 steps",
        metAt: "2026-09-01T15:00:00.000Z",
        windowEnd: "2026-09-01T21:00:00.000Z",
        updatedAt: "2026-09-01T15:00:00.000Z",
      },
    ]);

    await sync.upsertRules("user_123", [
      walkingRule({
        updatedAt: "2026-09-02T12:00:00.000Z",
        deletedAt: "2026-09-02T12:00:00.000Z",
      }),
    ]);

    expect((await sync.read("user_123")).earnedUnlocks).toHaveLength(1);
  });

  it("hands back only the most recent history a new device needs", async () => {
    const sync = repository();
    const days = Array.from({ length: 405 }, (_, index) => {
      const day = new Date(Date.UTC(2025, 0, 1 + index));
      return {
        day: day.toISOString().slice(0, 10),
        lockedAppMinutes: index,
        updatedAt: day.toISOString(),
      };
    });
    await sync.upsertUsageDays("user_123", days.slice(0, 400));
    await sync.upsertUsageDays("user_123", days.slice(400));

    const snapshot = await sync.read("user_123");
    expect({
      count: snapshot.usageDays.length,
      newest: snapshot.usageDays[0]?.day,
    }).toEqual({ count: 400, newest: "2026-02-09" });
  });
});

describe("sealed history sync", () => {
  it("round-trips a sealed day, including a day with no usage measurement", async () => {
    const sync = repository();

    const written = await sync.upsertHistoryDays("user_123", [
      sealedDay(),
      sealedDay({
        day: "2026-08-31",
        usageMinutes: null,
        activity: { walking: 0, gym: 0, running: 0, biking: 0 },
        met: false,
        scheduled: false,
        sealedAt: "2026-09-01T04:00:00.000Z",
        updatedAt: "2026-09-01T04:00:00.000Z",
      }),
    ]);

    expect({
      written,
      history: (await sync.read("user_123")).historyDays,
    }).toEqual({
      written: { applied: 2, skipped: 0 },
      history: [
        sealedDay(),
        {
          day: "2026-08-31",
          usageMinutes: null,
          activity: { walking: 0, gym: 0, running: 0, biking: 0 },
          met: false,
          scheduled: false,
          sealedAt: "2026-09-01T04:00:00.000Z",
          updatedAt: "2026-09-01T04:00:00.000Z",
        },
      ],
    });
  });

  it("refuses to unseal a day from a stale replay", async () => {
    const sync = repository();
    await sync.upsertHistoryDays("user_123", [sealedDay()]);

    const stale = await sync.upsertHistoryDays("user_123", [
      sealedDay({
        met: false,
        usageMinutes: 0,
        updatedAt: "2026-09-01T23:00:00.000Z",
      }),
    ]);

    expect({
      stale,
      met: (await sync.read("user_123")).historyDays[0]?.met,
    }).toEqual({ stale: { applied: 0, skipped: 1 }, met: true });
  });

  it("never hands one account another account's sealed days", async () => {
    const sync = repository();
    await sync.upsertHistoryDays("owner", [sealedDay()]);

    expect((await sync.read("attacker")).historyDays).toEqual([]);
  });
});

describe("profile sync", () => {
  it("stores the onboarding answers and keeps the newest", async () => {
    const sync = repository();
    await sync.upsertProfile("user_123", {
      name: "Person",
      referralSource: "tiktok",
      ageBand: "25-34",
      occupation: "student",
      improveFirst: "screenTime",
      mainReason: "focus",
      estimatedDailyMinutes: 240,
      units: "mi",
      updatedAt: "2026-09-02T12:00:00.000Z",
    });

    const stale = await sync.upsertProfile("user_123", {
      name: "Stale",
      updatedAt: "2026-09-01T12:00:00.000Z",
    });

    expect({
      stale,
      profile: (await sync.read("user_123")).profile,
    }).toEqual({
      stale: { applied: 0, skipped: 1 },
      profile: {
        name: "Person",
        referralSource: "tiktok",
        ageBand: "25-34",
        occupation: "student",
        improveFirst: "screenTime",
        mainReason: "focus",
        estimatedDailyMinutes: 240,
        units: "mi",
        updatedAt: "2026-09-02T12:00:00.000Z",
      },
    });
  });
});

describe("deleted accounts", () => {
  it("refuses a queued batch that arrives after erasure", async () => {
    await postgres.db.insert(users).values({
      id: "deleted_user",
      deletedAt: new Date("2026-09-02T12:00:00.000Z"),
    });
    const sync = repository();

    await expect(
      sync.upsertRules("deleted_user", [walkingRule()]),
    ).rejects.toBeInstanceOf(DeletedIdentityError);
    await expect(
      sync.upsertUsageDays("deleted_user", [
        { day: "2026-09-01", lockedAppMinutes: 5, updatedAt: "2026-09-01T09:00:00.000Z" },
      ]),
    ).rejects.toBeInstanceOf(DeletedIdentityError);
    await expect(
      sync.upsertHistoryDays("deleted_user", [sealedDay()]),
    ).rejects.toBeInstanceOf(DeletedIdentityError);
  });
});

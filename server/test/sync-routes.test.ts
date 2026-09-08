import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeletedIdentityError } from "../src/identity/index.js";
import { createSyncRoutes } from "../src/routes/sync.js";
import {
  MAX_SYNC_BATCH,
  type SyncRepository,
  type SyncSnapshot,
} from "../src/sync/index.js";

let app: FastifyInstance | undefined;

const RULE_ID = "11111111-1111-4111-8111-111111111111";

const emptySnapshot: SyncSnapshot = {
  rules: [],
  ruleDays: [],
  usageDays: [],
  earnedUnlocks: [],
  profile: null,
};

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function stubSync(overrides: Partial<SyncRepository> = {}): SyncRepository {
  return {
    replaceRules: vi.fn(async () => ({
      applied: 0,
      skipped: 0,
      tombstoned: 0,
    })),
    upsertRuleDays: vi.fn(async () => ({ applied: 0, skipped: 0 })),
    upsertUsageDays: vi.fn(async () => ({ applied: 0, skipped: 0 })),
    upsertEarnedUnlocks: vi.fn(async () => ({ applied: 0, skipped: 0 })),
    upsertProfile: vi.fn(async () => ({ applied: 0, skipped: 0 })),
    read: vi.fn(async () => emptySnapshot),
    ...overrides,
  };
}

async function buildApp(
  sync: SyncRepository,
  userId: string | null = "user_123",
): Promise<FastifyInstance> {
  const instance = Fastify({ logger: false });
  instance.addHook("onRequest", async (request) => {
    if (userId) {
      request.authIdentity = { userId, isAnonymous: false };
    }
  });
  await instance.register(createSyncRoutes({ sync }), { prefix: "/v1" });
  return instance;
}

const validRule = {
  id: RULE_ID,
  activity: "walking",
  mode: {
    kind: "target",
    activity: "walking",
    metric: "steps",
    goal: 5_000,
    place: "outside",
  },
  schedule: {
    days: [1, 2, 3, 4, 5],
    window: { kind: "range", startMinute: 540, endMinute: 1_260 },
  },
  enabled: true,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

describe("PUT /v1/sync/rules", () => {
  it("hands the validated rule set to the repository and reports the outcome", async () => {
    const replaceRules = vi.fn(async () => ({
      applied: 1,
      skipped: 0,
      tombstoned: 2,
    }));
    const sync = stubSync({ replaceRules });
    app = await buildApp(sync);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: { rules: [validRule] },
    });

    expect({
      status: response.statusCode,
      body: response.json(),
      calls: replaceRules.mock.calls,
    }).toEqual({
      status: 200,
      body: { applied: 1, skipped: 0, tombstoned: 2 },
      calls: [["user_123", [validRule]]],
    });
  });

  it("accepts an empty rule set as a deletion of everything", async () => {
    const replaceRules = vi.fn(async () => ({
      applied: 0,
      skipped: 0,
      tombstoned: 3,
    }));
    app = await buildApp(stubSync({ replaceRules }));

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: { rules: [] },
    });

    expect({ status: response.statusCode, calls: replaceRules.mock.calls }).toEqual({
      status: 200,
      calls: [["user_123", []]],
    });
  });

  it("accepts pausedReason without storing it", async () => {
    const replaceRules = vi.fn(async () => ({
      applied: 1,
      skipped: 0,
      tombstoned: 0,
    }));
    app = await buildApp(stubSync({ replaceRules }));

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: {
        rules: [
          {
            ...validRule,
            activity: "gym",
            mode: { kind: "event", activity: "gym", trigger: "arrival" },
            enabled: false,
            pausedReason: "noGym",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(replaceRules.mock.calls[0]?.[1][0]).toMatchObject({
      pausedReason: "noGym",
    });
  });
});

describe("sync payload privacy law", () => {
  it.each([
    ["an app name on the rule", { appName: "Instagram" }],
    ["a bundle id on the rule", { bundleId: "com.burbn.instagram" }],
  ])("rejects %s", async (_label, extra) => {
    const sync = stubSync();
    app = await buildApp(sync);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: { rules: [{ ...validRule, ...extra }] },
    });

    expect({
      status: response.statusCode,
      code: response.json<{ error: { code: string } }>().error.code,
      writes: (sync.replaceRules as ReturnType<typeof vi.fn>).mock.calls,
    }).toEqual({
      status: 400,
      code: "INVALID_SYNC_PAYLOAD",
      writes: [],
    });
  });

  it("rejects gym coordinates smuggled into a rule mode", async () => {
    const sync = stubSync();
    app = await buildApp(sync);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: {
        rules: [
          {
            ...validRule,
            activity: "gym",
            mode: {
              kind: "event",
              activity: "gym",
              trigger: "arrival",
              placeName: "Gold's Gym",
              latitude: 40.7,
              longitude: -74,
            },
          },
        ],
      },
    });

    expect({
      status: response.statusCode,
      writes: (sync.replaceRules as ReturnType<typeof vi.fn>).mock.calls,
    }).toEqual({ status: 400, writes: [] });
  });

  it("names the offending field without echoing its value", async () => {
    app = await buildApp(stubSync());

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: {
        rules: [{ ...validRule, mode: { ...validRule.mode, placeName: "Gold's Gym" } }],
      },
    });

    const message = response.json<{ error: { message: string } }>().error
      .message;
    expect({
      mentionsPath: message.includes("rules.0.mode"),
      leaksValue: message.includes("Gold's Gym"),
    }).toEqual({ mentionsPath: true, leaksValue: false });
  });

  it.each([
    ["a malformed timestamp", { updatedAt: "yesterday" }],
    ["a timestamp with no offset", { updatedAt: "2026-09-01T12:00:00" }],
    ["a non-uuid rule id", { id: "rule-1" }],
    ["a negative goal", { mode: { ...validRule.mode, goal: -1 } }],
    ["a weekday out of range", { schedule: { days: [7], window: { kind: "allDay" } } }],
    ["a minute past midnight", { schedule: { days: [1], window: { kind: "range", startMinute: 540, endMinute: 1_440 } } }],
  ])("rejects %s", async (_label, extra) => {
    const sync = stubSync();
    app = await buildApp(sync);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: { rules: [{ ...validRule, ...extra }] },
    });

    expect({
      status: response.statusCode,
      writes: (sync.replaceRules as ReturnType<typeof vi.fn>).mock.calls,
    }).toEqual({ status: 400, writes: [] });
  });

  it("rejects a health sample array on a rule day", async () => {
    const sync = stubSync();
    app = await buildApp(sync);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rule-days",
      payload: {
        ruleDays: [
          {
            ruleId: RULE_ID,
            day: "2026-09-01",
            progress: 5_200,
            met: true,
            metAt: "2026-09-01T15:00:00.000Z",
            updatedAt: "2026-09-01T15:00:00.000Z",
            samples: [{ at: "2026-09-01T14:00:00.000Z", steps: 12 }],
          },
        ],
      },
    });

    expect({
      status: response.statusCode,
      writes: (sync.upsertRuleDays as ReturnType<typeof vi.fn>).mock.calls,
    }).toEqual({ status: 400, writes: [] });
  });
});

describe("sync batch limits", () => {
  it("refuses a batch larger than the documented maximum", async () => {
    const sync = stubSync();
    app = await buildApp(sync);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/usage-days",
      payload: {
        usageDays: Array.from({ length: MAX_SYNC_BATCH + 1 }, (_, index) => ({
          day: new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10),
          lockedAppMinutes: 1,
          updatedAt: "2026-09-01T12:00:00.000Z",
        })),
      },
    });

    expect({
      status: response.statusCode,
      body: response.json(),
      writes: (sync.upsertUsageDays as ReturnType<typeof vi.fn>).mock.calls,
    }).toEqual({
      status: 400,
      body: {
        error: {
          code: "SYNC_BATCH_TOO_LARGE",
          message: `A sync batch holds at most 400 rows; received 401`,
        },
      },
      writes: [],
    });
  });

  it("accepts a batch exactly at the maximum", async () => {
    const upsertUsageDays = vi.fn(async () => ({
      applied: MAX_SYNC_BATCH,
      skipped: 0,
    }));
    app = await buildApp(stubSync({ upsertUsageDays }));

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/usage-days",
      payload: {
        usageDays: Array.from({ length: MAX_SYNC_BATCH }, (_, index) => ({
          day: new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10),
          lockedAppMinutes: 1,
          updatedAt: "2026-09-01T12:00:00.000Z",
        })),
      },
    });

    expect({
      status: response.statusCode,
      rows: upsertUsageDays.mock.calls[0]?.[1].length,
    }).toEqual({ status: 200, rows: MAX_SYNC_BATCH });
  });
});

describe("GET /v1/sync", () => {
  it("returns everything the user has for a restore", async () => {
    const snapshot: SyncSnapshot = {
      rules: [{ ...validRule, deletedAt: null }] as SyncSnapshot["rules"],
      ruleDays: [
        {
          ruleId: RULE_ID,
          day: "2026-09-01",
          progress: 5_200,
          met: true,
          metAt: "2026-09-01T15:00:00.000Z",
          updatedAt: "2026-09-01T15:00:00.000Z",
        },
      ],
      usageDays: [
        {
          day: "2026-09-01",
          lockedAppMinutes: 90,
          updatedAt: "2026-09-01T23:00:00.000Z",
        },
      ],
      earnedUnlocks: [
        {
          day: "2026-09-01",
          ruleId: RULE_ID,
          ruleName: "5,000 steps",
          metAt: "2026-09-01T15:00:00.000Z",
          windowEnd: "2026-09-01T21:00:00.000Z",
          updatedAt: "2026-09-01T15:00:00.000Z",
        },
      ],
      profile: {
        name: "Person",
        referralSource: null,
        ageBand: null,
        occupation: null,
        improveFirst: "screenTime",
        mainReason: null,
        estimatedDailyMinutes: 240,
        units: "mi",
        updatedAt: "2026-09-01T12:00:00.000Z",
      },
    };
    const read = vi.fn(async () => snapshot);
    app = await buildApp(stubSync({ read }));

    const response = await app.inject({ method: "GET", url: "/v1/sync" });

    expect({
      status: response.statusCode,
      body: response.json(),
      calls: read.mock.calls,
    }).toEqual({ status: 200, body: snapshot, calls: [["user_123"]] });
  });

  it("carries no app selection, which is device-bound and cannot sync", async () => {
    app = await buildApp(stubSync());

    const response = await app.inject({ method: "GET", url: "/v1/sync" });

    expect(Object.keys(response.json())).toEqual([
      "rules",
      "ruleDays",
      "usageDays",
      "earnedUnlocks",
      "profile",
    ]);
  });
});

describe("sync failure responses", () => {
  it("answers 410 once the account is erased", async () => {
    app = await buildApp(
      stubSync({
        replaceRules: vi.fn(async () => {
          throw new DeletedIdentityError();
        }),
      }),
    );

    const response = await app.inject({
      method: "PUT",
      url: "/v1/sync/rules",
      payload: { rules: [] },
    });

    expect({ status: response.statusCode, body: response.json() }).toEqual({
      status: 410,
      body: {
        error: {
          code: "ACCOUNT_DELETED",
          message: "This account has been deleted",
        },
      },
    });
  });

  it("answers 503 rather than 500 when persistence is unconfigured", async () => {
    app = await buildApp(
      stubSync({
        read: vi.fn(async () => {
          throw new Error("Sync persistence is not configured; missing DATABASE_URL");
        }),
      }),
    );

    const response = await app.inject({ method: "GET", url: "/v1/sync" });

    expect({
      status: response.statusCode,
      code: response.json<{ error: { code: string } }>().error.code,
    }).toEqual({ status: 503, code: "SYNC_UNAVAILABLE" });
  });

  it("refuses every sync route without a verified identity", async () => {
    const sync = stubSync();
    app = await buildApp(sync, null);

    const responses = await Promise.all([
      app.inject({ method: "GET", url: "/v1/sync" }),
      app.inject({ method: "PUT", url: "/v1/sync/rules", payload: { rules: [] } }),
      app.inject({
        method: "PUT",
        url: "/v1/sync/rule-days",
        payload: { ruleDays: [] },
      }),
      app.inject({
        method: "PUT",
        url: "/v1/sync/usage-days",
        payload: { usageDays: [] },
      }),
      app.inject({
        method: "PUT",
        url: "/v1/sync/earned-unlocks",
        payload: { earnedUnlocks: [] },
      }),
      app.inject({
        method: "PUT",
        url: "/v1/sync/profile",
        payload: { profile: { updatedAt: "2026-09-01T12:00:00.000Z" } },
      }),
    ]);

    expect({
      statuses: responses.map((response) => response.statusCode),
      reads: (sync.read as ReturnType<typeof vi.fn>).mock.calls,
      writes: (sync.replaceRules as ReturnType<typeof vi.fn>).mock.calls,
    }).toEqual({
      statuses: [401, 401, 401, 401, 401, 401],
      reads: [],
      writes: [],
    });
  });
});

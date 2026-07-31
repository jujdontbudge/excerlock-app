import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { users, vendorWebhookEvents } from "../src/db/schema.js";
import {
  createVendorWebhookService,
} from "../src/webhooks/index.js";
import {
  createDrizzleVendorRepository,
  type Vendor,
} from "../src/vendors/index.js";
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

function createWebhookAnalyticsSpy() {
  const capture = vi.fn();
  return {
    capture,
    analytics: {
      vendorDisconnected(userId: string, vendor: Vendor) {
        capture(userId, "vendor_disconnected", { vendor });
      },
      vendorEarnRecorded(userId: string, vendor: Vendor) {
        capture(userId, "vendor_earn_recorded", { vendor });
      },
    },
  };
}

async function createConnectedRepository(
  vendor: Vendor,
  externalUserId: string,
) {
  await postgres.db.insert(users).values({ id: "user_123" });
  const repository = createDrizzleVendorRepository(postgres.db);
  await repository.upsertConnection({
    id: `${vendor}-connection-id`,
    userId: "user_123",
    vendor,
    externalUserId,
    accessTokenCiphertext: "encrypted-access-token",
    refreshTokenCiphertext: null,
    accessTokenExpiresAt: null,
    scopes: "",
  });
  return repository;
}

describe("notify-only vendor webhook ingestion", () => {
  it("records the same delivery once and emits analytics once", async () => {
    const rawPayload =
      '{"user_id":67890,"id":"550e8400-e29b-41d4-a716-446655440000","type":"workout.updated","trace_id":"e369c784-5100-49e8-8098-75d35c47b31b"}';
    const repository = await createConnectedRepository("whoop", "67890");
    const { analytics, capture } = createWebhookAnalyticsSpy();
    const service = createVendorWebhookService({
      repository,
      analytics,
      now: () => new Date("2026-07-29T19:00:00.000Z"),
      randomId: () => "webhook-event-id",
    });

    const first = await service.recordVerified("whoop", rawPayload);
    const replay = await service.recordVerified("whoop", rawPayload);
    const events = await postgres.db.select().from(vendorWebhookEvents);

    expect({
      first,
      replay,
      events,
      analytics: capture.mock.calls,
    }).toEqual({
      first: { recorded: true, eventId: "webhook-event-id" },
      replay: { recorded: false, eventId: "webhook-event-id" },
      events: [
        {
          id: "webhook-event-id",
          userId: "user_123",
          vendor: "whoop",
          externalUserId: "67890",
          deliveryKey:
            "260fd64e45d9cf4e4190ccf31d3ce28eeb76b0137839192f658ee957d7b0455b",
          eventType: "workout.updated",
          rawPayload,
          receivedAt: new Date("2026-07-29T19:00:00.000Z"),
        },
      ],
      analytics: [
        ["user_123", "vendor_earn_recorded", { vendor: "whoop" }],
      ],
    });
  });

  it("records Strava deauthorization, disconnects once, and records no earning", async () => {
    const rawPayload =
      '{"aspect_type":"update","event_time":1785351600,"object_id":12345,"object_type":"athlete","owner_id":12345,"subscription_id":120475,"updates":{"authorized":"false"}}';
    const repository = await createConnectedRepository("strava", "12345");
    const { analytics, capture } = createWebhookAnalyticsSpy();
    const service = createVendorWebhookService({
      repository,
      analytics,
      now: () => new Date("2026-07-29T19:00:00.000Z"),
      randomId: () => "deauthorization-event-id",
    });

    const first = await service.recordVerified("strava", rawPayload);
    const replay = await service.recordVerified("strava", rawPayload);
    const events = await postgres.db.select().from(vendorWebhookEvents);
    const connection = await repository.findConnection(
      "user_123",
      "strava",
    );

    expect({
      first,
      replay,
      events,
      connection,
      analytics: capture.mock.calls,
    }).toEqual({
      first: {
        recorded: true,
        eventId: "deauthorization-event-id",
      },
      replay: { recorded: false, eventId: null },
      events: [
        {
          id: "deauthorization-event-id",
          userId: "user_123",
          vendor: "strava",
          externalUserId: "12345",
          deliveryKey:
            "43bcbaad75a1630cf303b7986609b79bda45e0b10754e53bb577647de9d26f85",
          eventType: "athlete.deauthorize",
          rawPayload,
          receivedAt: new Date("2026-07-29T19:00:00.000Z"),
        },
      ],
      connection: null,
      analytics: [
        [
          "user_123",
          "vendor_disconnected",
          { vendor: "strava" },
        ],
      ],
    });
  });
});

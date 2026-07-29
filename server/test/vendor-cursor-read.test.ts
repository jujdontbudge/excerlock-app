import { describe, expect, it } from "vitest";
import {
  createVendorEventFeed,
  type VendorEventCursor,
  type VendorEventFeedRepository,
  type VendorWebhookEventRecord,
} from "../src/webhooks/index.js";

class MemoryEventFeedRepository implements VendorEventFeedRepository {
  constructor(private readonly events: readonly VendorWebhookEventRecord[]) {}

  async listWebhookEvents(
    userId: string,
    after: VendorEventCursor | null,
    limit: number,
  ): Promise<readonly VendorWebhookEventRecord[]> {
    return this.events
      .filter((event) => event.userId === userId)
      .filter(
        (event) =>
          !after ||
          event.receivedAt > after.receivedAt ||
          (event.receivedAt.getTime() === after.receivedAt.getTime() &&
            event.id > after.id),
      )
      .slice(0, limit);
  }
}

const events = [
  {
    id: "event-1",
    userId: "user_123",
    vendor: "strava",
    externalUserId: "12345",
    deliveryKey: "delivery-1",
    eventType: "activity.create",
    rawPayload: '{"object_id":1}',
    receivedAt: new Date("2026-07-29T19:00:00.000Z"),
  },
  {
    id: "event-2",
    userId: "another_user",
    vendor: "oura",
    externalUserId: "oura-other",
    deliveryKey: "delivery-other",
    eventType: "daily_activity.update",
    rawPayload: '{"object_id":"private"}',
    receivedAt: new Date("2026-07-29T19:00:00.500Z"),
  },
  {
    id: "event-3",
    userId: "user_123",
    vendor: "whoop",
    externalUserId: "67890",
    deliveryKey: "delivery-3",
    eventType: "workout.updated",
    rawPayload: '{"id":"workout-1"}',
    receivedAt: new Date("2026-07-29T19:00:01.000Z"),
  },
  {
    id: "event-4",
    userId: "user_123",
    vendor: "polar",
    externalUserId: "24680",
    deliveryKey: "delivery-4",
    eventType: "EXERCISE",
    rawPayload: '{"entity_id":"exercise-1"}',
    receivedAt: new Date("2026-07-29T19:00:02.000Z"),
  },
] as const satisfies readonly VendorWebhookEventRecord[];

describe("vendor webhook cursor feed", () => {
  it("returns only the user's raw notifications after the cursor", async () => {
    const feed = createVendorEventFeed(
      new MemoryEventFeedRepository(events),
    );

    const first = await feed.readSince("user_123", null, 2);
    const second = await feed.readSince(
      "user_123",
      first.nextCursor,
      2,
    );

    expect({
      first,
      second,
    }).toEqual({
      first: {
        events: [
          {
            id: "event-1",
            vendor: "strava",
            eventType: "activity.create",
            receivedAt: "2026-07-29T19:00:00.000Z",
            payload: { object_id: 1 },
          },
          {
            id: "event-3",
            vendor: "whoop",
            eventType: "workout.updated",
            receivedAt: "2026-07-29T19:00:01.000Z",
            payload: { id: "workout-1" },
          },
        ],
        nextCursor: expect.any(String),
      },
      second: {
        events: [
          {
            id: "event-4",
            vendor: "polar",
            eventType: "EXERCISE",
            receivedAt: "2026-07-29T19:00:02.000Z",
            payload: { entity_id: "exercise-1" },
          },
        ],
        nextCursor: expect.any(String),
      },
    });
    expect(second.nextCursor).not.toBe(first.nextCursor);
  });
});

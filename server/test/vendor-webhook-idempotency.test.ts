import { describe, expect, it, vi } from "vitest";
import {
  createVendorWebhookService,
  type NewVendorWebhookEventRecord,
  type VendorWebhookConnection,
  type VendorWebhookRepository,
} from "../src/webhooks/index.js";
import type { Vendor } from "../src/vendors/index.js";

class MemoryWebhookRepository implements VendorWebhookRepository {
  readonly events: NewVendorWebhookEventRecord[] = [];
  private readonly deliveryKeys = new Map<string, string>();

  constructor(private readonly connection: VendorWebhookConnection) {}

  async findConnectionByExternalUserId(
    vendor: Vendor,
    externalUserId: string,
  ): Promise<VendorWebhookConnection | null> {
    return this.connection.vendor === vendor &&
      this.connection.externalUserId === externalUserId
      ? this.connection
      : null;
  }

  async insertWebhookEvent(
    event: NewVendorWebhookEventRecord,
  ): Promise<{ inserted: boolean; eventId: string }> {
    const uniquenessKey = `${event.vendor}:${event.deliveryKey}`;
    const existingId = this.deliveryKeys.get(uniquenessKey);
    if (existingId) {
      return { inserted: false, eventId: existingId };
    }
    this.deliveryKeys.set(uniquenessKey, event.id);
    this.events.push(event);
    return { inserted: true, eventId: event.id };
  }
}

describe("notify-only vendor webhook ingestion", () => {
  it("records the same delivery once and emits analytics once", async () => {
    const rawPayload =
      '{"user_id":67890,"id":"550e8400-e29b-41d4-a716-446655440000","type":"workout.updated","trace_id":"e369c784-5100-49e8-8098-75d35c47b31b"}';
    const repository = new MemoryWebhookRepository({
      id: "whoop-connection-id",
      userId: "user_123",
      vendor: "whoop",
      externalUserId: "67890",
    });
    const capture = vi.fn();
    const service = createVendorWebhookService({
      repository,
      analytics: { capture },
      now: () => new Date("2026-07-29T19:00:00.000Z"),
      randomId: () => "webhook-event-id",
    });

    const first = await service.recordVerified("whoop", rawPayload);
    const replay = await service.recordVerified("whoop", rawPayload);

    expect({
      first,
      replay,
      events: repository.events,
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
});

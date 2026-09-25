import type {
  VendorEventCursor,
  VendorEventFeedRepository,
} from "../repository.js";
import { VendorClientError } from "../../model/vendorClientError.js";
import type { Vendor } from "../../model/vendor.js";

const MAX_PAGE_SIZE = 100;

export interface VendorEventFeedItem {
  id: string;
  vendor: Vendor;
  eventType: string;
  receivedAt: string;
  payload: unknown;
}

export interface VendorEventFeedPage {
  events: readonly VendorEventFeedItem[];
  nextCursor: string | null;
}

export interface VendorEventFeed {
  readSince(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<VendorEventFeedPage>;
}

function encodeCursor(cursor: VendorEventCursor): string {
  return Buffer.from(
    JSON.stringify({
      receivedAt: cursor.receivedAt.toISOString(),
      id: cursor.id,
    }),
  ).toString("base64url");
}

function decodeCursor(cursor: string | null): VendorEventCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("receivedAt" in decoded) ||
      typeof decoded.receivedAt !== "string" ||
      !("id" in decoded) ||
      typeof decoded.id !== "string" ||
      decoded.id.length === 0
    ) {
      throw new Error("Invalid cursor shape");
    }
    const receivedAt = new Date(decoded.receivedAt);
    if (Number.isNaN(receivedAt.getTime())) {
      throw new Error("Invalid cursor timestamp");
    }
    return { receivedAt, id: decoded.id };
  } catch {
    throw new VendorClientError("Vendor event cursor is invalid");
  }
}

export function createVendorEventFeed(
  repository: VendorEventFeedRepository,
): VendorEventFeed {
  return {
    async readSince(userId, cursor, limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
        throw new VendorClientError(
          `Vendor event page size must be between 1 and ${MAX_PAGE_SIZE}`,
        );
      }

      const events = await repository.listWebhookEvents(
        userId,
        decodeCursor(cursor),
        limit,
      );
      const items = events.map((event) => ({
        id: event.id,
        vendor: event.vendor,
        eventType: event.eventType,
        receivedAt: event.receivedAt.toISOString(),
        payload: JSON.parse(event.rawPayload) as unknown,
      }));
      const lastEvent = events.at(-1);

      return {
        events: items,
        nextCursor: lastEvent
          ? encodeCursor({
              receivedAt: lastEvent.receivedAt,
              id: lastEvent.id,
            })
          : cursor,
      };
    },
  };
}

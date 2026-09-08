import { randomUUID } from "node:crypto";
import type { Vendor } from "../vendors/types.js";
import { parseVendorNotification } from "./notification.js";
import type {
  NewVendorWebhookEventRecord,
  VendorWebhookRepository,
} from "./repository.js";

export interface VendorWebhookServiceOptions {
  repository: VendorWebhookRepository;
  now?: () => Date;
  randomId?: () => string;
}

export interface VendorWebhookService {
  recordVerified(
    vendor: Vendor,
    rawPayload: string,
  ): Promise<{ recorded: boolean; eventId: string | null }>;
}

export function createVendorWebhookService(
  options: VendorWebhookServiceOptions,
): VendorWebhookService {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? randomUUID;

  return {
    async recordVerified(vendor, rawPayload) {
      const notification = parseVendorNotification(vendor, rawPayload);
      if (!notification) {
        return { recorded: false, eventId: null };
      }

      const connection =
        await options.repository.findConnectionByExternalUserId(
          vendor,
          notification.externalUserId,
        );
      if (!connection) {
        return { recorded: false, eventId: null };
      }

      const event: NewVendorWebhookEventRecord = {
        id: randomId(),
        userId: connection.userId,
        vendor,
        externalUserId: notification.externalUserId,
        deliveryKey: notification.deliveryKey,
        eventType: notification.eventType,
        rawPayload,
        receivedAt: now(),
      };
      const inserted = await options.repository.insertWebhookEvent(event);
      if (inserted.inserted) {
        // The connection row is the record; v1 emits no vendor analytics (P2-T07).
        if (notification.disconnectsConnection) {
          await options.repository.deleteConnection(connection.id);
        }
      }

      return {
        recorded: inserted.inserted,
        eventId: inserted.eventId,
      };
    },
  };
}

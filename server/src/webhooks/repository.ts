import type { Vendor } from "../vendors/types.js";

export interface VendorWebhookConnection {
  id: string;
  userId: string;
  vendor: Vendor;
  externalUserId: string;
}

export interface NewVendorWebhookEventRecord {
  id: string;
  userId: string;
  vendor: Vendor;
  externalUserId: string;
  deliveryKey: string;
  eventType: string;
  rawPayload: string;
  receivedAt: Date;
}

export interface VendorWebhookRepository {
  findConnectionByExternalUserId(
    vendor: Vendor,
    externalUserId: string,
  ): Promise<VendorWebhookConnection | null>;
  insertWebhookEvent(
    event: NewVendorWebhookEventRecord,
  ): Promise<{ inserted: boolean; eventId: string }>;
}

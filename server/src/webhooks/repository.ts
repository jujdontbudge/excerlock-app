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

export type VendorWebhookEventRecord = NewVendorWebhookEventRecord;

export interface VendorEventCursor {
  receivedAt: Date;
  id: string;
}

export interface VendorWebhookRepository {
  findConnectionByExternalUserId(
    vendor: Vendor,
    externalUserId: string,
  ): Promise<VendorWebhookConnection | null>;
  insertWebhookEvent(
    event: NewVendorWebhookEventRecord,
  ): Promise<{ inserted: boolean; eventId: string }>;
  deleteConnection(connectionId: string): Promise<void>;
}

export interface VendorEventFeedRepository {
  listWebhookEvents(
    userId: string,
    after: VendorEventCursor | null,
    limit: number,
  ): Promise<readonly VendorWebhookEventRecord[]>;
}

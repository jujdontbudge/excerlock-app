import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
} from "../src/db/index.js";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("vendor database schema", () => {
  it("stores encrypted connections and notify-only webhook records", () => {
    expect(columnNames(vendorConnections)).toEqual([
      "id",
      "user_id",
      "vendor",
      "external_user_id",
      "access_token_ciphertext",
      "refresh_token_ciphertext",
      "access_token_expires_at",
      "scopes",
      "created_at",
      "updated_at",
    ]);
    expect(columnNames(vendorOAuthStates)).toEqual([
      "state_hash",
      "user_id",
      "vendor",
      "expires_at",
      "created_at",
    ]);
    expect(columnNames(vendorWebhookEvents)).toEqual([
      "id",
      "user_id",
      "vendor",
      "external_user_id",
      "delivery_key",
      "event_type",
      "raw_payload",
      "received_at",
    ]);
  });
});

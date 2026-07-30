import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  featureRequests,
  featureRequestVotes,
  supportRequests,
} from "../src/db/index.js";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

function uniqueIndexes(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes
    .filter((index) => index.config.unique)
    .map((index) => ({
      name: index.config.name,
      columns: index.config.columns.map((column) =>
        "name" in column ? column.name : String(column),
      ),
    }));
}

describe("support database schema", () => {
  it("stores notify-only requests and constrains one vote per user and request", () => {
    expect(columnNames(supportRequests)).toEqual([
      "id",
      "user_id",
      "category",
      "title",
      "message",
      "created_at",
    ]);
    expect(columnNames(featureRequests)).toEqual([
      "id",
      "support_request_id",
      "title",
      "message",
      "created_at",
    ]);
    expect(columnNames(featureRequestVotes)).toEqual([
      "id",
      "feature_request_id",
      "user_id",
      "created_at",
    ]);
    expect(uniqueIndexes(featureRequestVotes)).toContainEqual({
      name: "feature_request_votes_request_user_unique",
      columns: ["feature_request_id", "user_id"],
    });

    const allColumns = [
      ...columnNames(supportRequests),
      ...columnNames(featureRequests),
      ...columnNames(featureRequestVotes),
    ];
    expect(allColumns).not.toEqual(
      expect.arrayContaining(["minutes", "earnings", "ledger", "shield"]),
    );
  });
});

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
    // One assertion per forbidden name, deliberately. `arrayContaining` matches
    // only when *every* listed element is present, so a single negated call
    // would still pass with a `minutes` column as long as the other three were
    // absent — the notify-only law would read as enforced while being broken.
    for (const forbidden of ["minutes", "earnings", "ledger", "shield"]) {
      expect(
        allColumns.filter((column) => column.includes(forbidden)),
        `Support tables must never carry ${forbidden}: the server does not compute earning or locking state`,
      ).toEqual([]);
    }
  });
});

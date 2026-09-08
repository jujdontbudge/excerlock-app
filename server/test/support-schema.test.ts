import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { supportRequests } from "../src/db/index.js";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("support database schema", () => {
  it("stores the form submission and nothing that could be voted on", () => {
    expect(columnNames(supportRequests)).toEqual([
      "id",
      "user_id",
      "category",
      "title",
      "message",
      "created_at",
    ]);

    // One assertion per forbidden name, deliberately. `arrayContaining` matches
    // only when *every* listed element is present, so a single negated call
    // would still pass with a `minutes` column as long as the other three were
    // absent — the notify-only law would read as enforced while being broken.
    for (const forbidden of ["minutes", "earnings", "ledger", "shield", "vote"]) {
      expect(
        columnNames(supportRequests).filter((column) =>
          column.includes(forbidden),
        ),
        `Support tables must never carry ${forbidden}: the server does not compute earning or locking state, and feature voting is cut (B17)`,
      ).toEqual([]);
    }
  });
});

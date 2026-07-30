import { drizzle } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "../src/db/schema.js";

export interface RecordedPostgresQuery {
  sql: string;
  params: readonly unknown[];
}

type QueryResponder = (
  sql: string,
  params: readonly unknown[],
) => readonly (readonly unknown[])[];

export function createPostgresJsTestDatabase(
  respond: QueryResponder = () => [],
) {
  const queries: RecordedPostgresQuery[] = [];
  let transactionCount = 0;

  const client = {
    options: {
      parsers: {},
      serializers: {},
    },
    unsafe(sql: string, params: readonly unknown[] = []) {
      queries.push({ sql, params });
      const rows = respond(sql, params);
      return Object.assign(Promise.resolve(rows), {
        values: async () => rows,
      });
    },
    async begin<T>(transaction: (transactionClient: Sql) => Promise<T>) {
      transactionCount += 1;
      return transaction(client as unknown as Sql);
    },
  };

  return {
    db: drizzle(client as unknown as Sql, { schema }),
    queries,
    get transactionCount() {
      return transactionCount;
    },
  };
}

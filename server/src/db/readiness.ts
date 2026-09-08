import { sql } from "drizzle-orm";

/**
 * Every table the API needs before it can serve anything beyond liveness.
 * Kept explicit rather than derived from the schema module so that dropping a
 * table from `schema.ts` cannot silently relax the check.
 */
const REQUIRED_TABLES = [
  "users",
  "adapty_subscription_states",
  "adapty_webhook_events",
  "support_requests",
  "rules",
  "rule_days",
  "usage_days",
  "earned_unlocks",
  "history_days",
  "profiles",
] as const;

export type ReadinessResult =
  | { ready: true }
  | { ready: false; reason: "no-database-url" | "schema-missing" };

interface QueryableDatabase {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}

function countRows(result: unknown): number {
  // postgres-js returns an array; PGlite returns { rows }. Normalise both
  // rather than binding the check to one driver.
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] } | null)?.rows ?? []);
  const first = rows[0] as { present?: unknown } | undefined;
  return Number(first?.present ?? 0);
}

/**
 * Answers whether the schema this build expects is actually present.
 *
 * A liveness probe cannot answer this: the process starts and serves happily
 * against an empty database, which is exactly how an unmigrated production box
 * went unnoticed. Readiness is deliberately a separate question.
 */
export async function checkSchemaReady(
  db: QueryableDatabase | null,
): Promise<ReadinessResult> {
  if (!db) {
    return { ready: false, reason: "no-database-url" };
  }

  try {
    const result = await db.execute(sql`
      select count(*)::int as present
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (${sql.join(
          REQUIRED_TABLES.map((table) => sql`${table}`),
          sql`, `,
        )})
    `);

    return countRows(result) === REQUIRED_TABLES.length
      ? { ready: true }
      : { ready: false, reason: "schema-missing" };
  } catch {
    return { ready: false, reason: "schema-missing" };
  }
}

import { sql } from "drizzle-orm";

const REQUIRED_TABLES = [
  "users",
  "adapty_subscription_states",
  "adapty_webhook_events",
  "support_requests",
  "feature_requests",
  "feature_request_votes",
  "incident_reports",
  "vendor_connections",
  "vendor_oauth_states",
  "vendor_webhook_events",
] as const;

export type ReadinessResult =
  | { ready: true }
  | { ready: false; reason: "no-database-url" | "schema-missing" };

interface QueryableDatabase {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}

function countRows(result: unknown): number {
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] } | null)?.rows ?? []);
  const first = rows[0] as { present?: unknown } | undefined;
  return Number(first?.present ?? 0);
}

export async function checkSchemaReady(
  db: QueryableDatabase | null,
): Promise<ReadinessResult> {
  if (!db) {
    return { ready: false, reason: "no-database-url" };
  }

  try {
    const result = await db.execute(sql`
      select (
        (select count(*)
          from information_schema.tables
          where table_schema = 'public'
            and table_name in (${sql.join(
              REQUIRED_TABLES.map((table) => sql`${table}`),
              sql`, `,
            )})) = ${REQUIRED_TABLES.length}
        and not exists (
          select 1
          from (values
            ('users', 'clerk_deleted_at'),
            ('users', 'auth_provider'),
            ('users', 'auth_deleted_at'),
            ('users', 'deletion_attempts'),
            ('users', 'deletion_next_retry_at'),
            ('users', 'deletion_lease_owner'),
            ('users', 'deletion_lease_expires_at'),
            ('users', 'deletion_last_error'),
            ('adapty_subscription_states', 'status'),
            ('adapty_subscription_states', 'is_in_grace_period'),
            ('adapty_subscription_states', 'source'),
            ('adapty_subscription_states', 'sync_state'),
            ('adapty_subscription_states', 'last_delivery_key')
          ) as required_columns(table_name, column_name)
          left join information_schema.columns actual
            on actual.table_schema = 'public'
            and actual.table_name = required_columns.table_name
            and actual.column_name = required_columns.column_name
          where actual.column_name is null
        )
        and exists (
          select 1
          from pg_indexes catalog_index
          join pg_namespace index_namespace
            on index_namespace.nspname = catalog_index.schemaname
          join pg_class index_relation
            on index_relation.relnamespace = index_namespace.oid
            and index_relation.relname = catalog_index.indexname
          join pg_index index_state
            on index_state.indexrelid = index_relation.oid
          where catalog_index.schemaname = 'public'
            and catalog_index.tablename = 'users'
            and catalog_index.indexname = 'users_deletion_retry_index'
            and index_state.indisvalid
            and index_state.indisready
            and position(
              '(deleted_at, deletion_next_retry_at)'
              in replace(catalog_index.indexdef, '"', '')
            ) > 0
        )
        and coalesce((
          select string_agg(kcu.column_name, ',' order by kcu.ordinal_position)
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on kcu.constraint_schema = tc.constraint_schema
            and kcu.constraint_name = tc.constraint_name
            and kcu.table_schema = tc.table_schema
            and kcu.table_name = tc.table_name
          where tc.table_schema = 'public'
            and tc.table_name = 'adapty_subscription_states'
            and tc.constraint_type = 'PRIMARY KEY'
        ), '') = 'user_id,environment'
        and coalesce((
          select string_agg(kcu.column_name, ',' order by kcu.ordinal_position)
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on kcu.constraint_schema = tc.constraint_schema
            and kcu.constraint_name = tc.constraint_name
            and kcu.table_schema = tc.table_schema
            and kcu.table_name = tc.table_name
          where tc.table_schema = 'public'
            and tc.table_name = 'adapty_webhook_events'
            and tc.constraint_type = 'PRIMARY KEY'
        ), '') = 'environment,delivery_key'
      )::int as present
    `);

    return countRows(result) === 1
      ? { ready: true }
      : { ready: false, reason: "schema-missing" };
  } catch {
    return { ready: false, reason: "schema-missing" };
  }
}

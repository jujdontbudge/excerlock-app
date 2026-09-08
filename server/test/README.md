# Server test support

Contract: hides shared repository-test support. Invariants: fixtures contain
no production behavior, migrations are the source of test schema truth, and
database doubles respond only at the external driver seam.

Fixtures: `postgresJsTestDatabase.ts` records statements, parameters, and
transaction entry for narrow SQL-generation and failure-injection tests.
`pgliteTestDatabase.ts` executes repository behavior against an in-memory
Postgres instance migrated from `server/drizzle`; its `reset` method truncates
all repository tables between tests. Run all consumers with
`npm run test:server` from the repository root.

Lifecycle: each repository test file owns one isolated PGlite instance, runs
the full migration chain once, truncates between tests, and closes after the
file. Vitest can initialize the files in parallel without cross-file state.
That parallel boot is why `vitest.config.ts` sets a 30-second timeout: on a
loaded machine a PGlite instance can take many seconds to come up, and a
5-second default turns that into a failure that reads like a broken
assertion.

`migration-supabase-sync.test.ts` is the exception to "migrate the whole
chain": it copies `server/drizzle` to a scratch directory and trims the
journal so the database stops at a chosen migration, which is how a migration
can be tested against the schema it will actually meet on the box.

Every test file is typechecked by `tsconfig.test.json` before vitest runs. A
test that does not compile is a test that is not being read.

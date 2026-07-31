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
On the implementation machine, `npm run test:server` measured 3.47 seconds
before PGlite and 4.76 seconds after it (19 files, 76 tests).

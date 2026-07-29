# Server

Contract: this workspace will host the Fastify, Drizzle, and Postgres product described in
`ARCHITECTURE.md`; Phase 0 establishes and hides its internal module boundaries without a runtime.

Invariants: the server may import analytics and condition-model types, never ledger math. Raw vendor
payloads remain transit-only, and vendor webhooks notify devices rather than evaluating earnings.

Fixtures: PGlite and vendor HTTP fixtures arrive with their first tests. Test with
`npm run test:server` from the repository root.

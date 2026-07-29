# Server

This workspace will host the Fastify, Drizzle, and Postgres product described in
`ARCHITECTURE.md`. Phase 0 establishes module boundaries only; there is no server runtime yet.

The server may import analytics and condition-model types, never ledger math. Raw vendor payloads
remain transit-only, and vendor webhooks notify devices rather than evaluating earnings.

Run the current server test seam with `npm run test:server` from the repository root.

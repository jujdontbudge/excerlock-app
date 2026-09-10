# T04 server verification

Verified locally on 2026-09-10 without live credentials, remote migrations,
provider calls, deployment, or device/simulator work.

- `npm run typecheck`: exit 0
- `npm run typecheck:test`: exit 0
- `npx vitest run --maxWorkers=1`: exit 0; 34 files, 170 tests passed
- focused deletion service/repository/worker run: exit 0; 3 files, 19 tests passed
- `git diff --check`: exit 0

The default parallel `npm test` run hit the pre-existing 5-second timeout in a
PGlite readiness test under suite contention. The same timed-out readiness and
migrator files passed together (2 files, 9 tests), and the complete suite passed
with one worker. No assertion or implementation failure remained.

Coverage includes strict issuer/audience/expiry/algorithm JWT rejection,
verified anonymous Supabase JWTs, explicit issuer dispatch for optional legacy
Clerk sessions, canonical UUID provisioning, tombstone 410 gates, fail-closed
tombstone lookup, provider-last erasure, per-stage replay, Supabase not-found
idempotency, lost-response checkpoint recovery, atomic replica leases, retry
bookkeeping, and late-webhook non-resurrection.

Deployment must apply local migrations `0006_supabase-identity-and-durable-erasure.sql`
and `0007_deletion-retry-index.sql` before starting this server version. Runtime
configuration is documented in `src/userDeletion/README.md`.

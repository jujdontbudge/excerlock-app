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

Deployment must use the current ordered journal, including the forward-only
`0006_legacy-production-bridge.sql`, followed by identity `0007`, retry-index
`0008`, and Adapty partition `0009`. Production already applied superseded
0006/0007; never overwrite their history or apply the old instructions by index.
The bridge refuses ambiguous provider tombstones before mutation. Fresh and
exact-legacy upgrade/replay tests are in `test/migration-compatibility.test.ts`;
see ADR0018. Runtime configuration is documented in `src/userDeletion/README.md`.
This is local upgrade proof, not evidence of production deployment.

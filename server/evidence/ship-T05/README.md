# T05 backend verification

Local-only verification on 2026-09-10:

- `npm run typecheck`: exit 0
- `npm run typecheck:test`: exit 0
- `npx vitest run --maxWorkers=1`: exit 0; 35 files, 183 tests passed
- migrated PGlite covers composite environment state, deletion of both
  partitions, tombstone protection, deterministic ordering, and dedupe

No remote migration, Adapty API call, webhook delivery, deployment, client
change, or credential output occurred. Official Adapty webhook documentation
(`https://adapty.io/docs/webhook-event-types-and-fields`) confirms nullable
customer IDs and the premium access-level event fields used here. Transaction
profile aggregates are not partition authority. The profile resync response
does not document per-environment premium aggregates, so it stays read-only and
fails closed.

Root review correction: production authorization intrinsically rejects sandbox/unknown and requires active
premium state. Confirmed active grace remains entitled past nominal expiry; inactive grace never grants.
An ambiguous profile resync performs no state writes and marks refresh observations unavailable, but does
not revoke an already-authoritative current webhook authorization. Missing production remains unknown/denied.
Official profile schema cannot currently prove per-environment premium access; this is explicitly NOT proof
of successful upstream state repair. Live webhook/sandbox/device attribution remains an acceptance gate.

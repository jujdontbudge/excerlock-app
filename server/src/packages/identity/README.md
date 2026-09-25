# Identity provisioning

The authenticated app calls `PUT /v1/user` after Supabase activates a session.
This module idempotently creates the minimal Postgres identity-spine row; it
does not retain email or copy auth profile fields.

A deletion tombstone is permanent. Provisioning locks the row and rejects a
matching tombstone rather than clearing `deleted_at`, so a stale session
or retry cannot resurrect an erased account. Account deletion independently
allows tombstones because it must resume downstream erasure checkpoints.

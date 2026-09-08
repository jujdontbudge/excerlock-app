# Identity provisioning

The authenticated app calls `PUT /v1/user` after Supabase issues a session,
anonymous sessions included. This module idempotently creates the minimal
Postgres identity-spine row; it does not retain email or copy any Supabase
profile field.

A deletion tombstone is permanent. Provisioning locks the row and rejects a
matching tombstone rather than clearing `deleted_at`, so a stale Supabase
session or retry cannot resurrect an erased account. Account deletion
independently allows tombstones because it must resume downstream erasure
checkpoints.

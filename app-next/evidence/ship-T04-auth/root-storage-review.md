# Root secure-session review — 2026-09-10

Base a7ec17d not accepted wholesale: identity concurrency/provider review is separately in progress.

Found chunk replacement overwrote committed chunks before committing manifest; interrupted write could
silently produce mixed session bytes. Also chunk limit used UTF-16 length, erasure suppressed errors,
and auth-js 2.116.0 src/lib/helpers.ts getItemAsync maps malformed JSON to absent.

Root correction: two bounded copy-on-write banks, per-backend/key serialization across instances,
UTF-8 byte chunks, manifest length/checksum (accidental corruption detection, NOT cryptographic signing),
legacy manifest read/migration, explicit logical-erasure tombstone before secret cleanup, visible erasure
failure, strict canonical session shape before auth-js can silently reset. The backend single-item write
is the commit boundary. No credential values logged.

Tests-first: initial 6 failures / 8 passes reproduced defects. Final 17 tests across storage + noSecrets
pass; interrupted every chunk/manifest write, concurrency, Unicode bytes, corruption, orphan read failure,
sparse orphan, failed erasure and legacy migration. Focused ESLint/diff-check pass. Whole typecheck still
has only the separately pending config/native integration error. Logs beside this file.

Limits: injected memory backend, not device Keychain crash/power-loss proof. Bounded cleanup/orphan scans
perform up to 96 Keychain reads; device boot/performance gate must measure this. Legacy v1 format had no
integrity checksum, so an already mixed but valid legacy session cannot be repaired by this migration.

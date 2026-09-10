# Ship acceptance status — 2026-09-10

**Not submission-ready.**

Current user-authorized endpoint: submission-ready only; TestFlight is allowed. App Review submission,
public release, and production OTA publication are prohibited. Historical public-store/OTA execution
requirements remain in the original plans for reference but are not completion gates for this revised goal. This index distinguishes current `plans/ship/` gates from older rebuild evidence.
Existing `T13`, `T14`, `T15` and `T16` folders include historical task numbering, fake-runtime previews,
and Debug recordings. Their filenames and passing tests do not certify the corresponding Ship tasks.
Preserve those artifacts as historical evidence; never substitute them for current release acceptance.

## Current verified local checkpoints

| Evidence | What it proves | What it does not prove |
| --- | --- | --- |
| App commit7619c5bd:238 suites,1154 tests,13 snapshots; typecheck pass; lint0errors/52warnings (`/tmp/ship-schedule-final-full.log`) | Covered local behavior, including schedule repair and rejection | Real sensors, signed execution, device purchase/auth/shields, release UI |
| Server c26bac8f:36files/192tests; typecheck/build/Drizzle check (`/tmp/ship-server-bridge-integrated.log`) | Fresh and exact legacy migration compatibility, journal preservation/replay, readiness schema checks | Applied remote migration or live provider erasure |
| Distribution verifier:9Python tests and shell syntax | Verifier predicates tested | Existence of a verified signed IPA |
| Real-graph synthetic production export at a4c738bc | Production JS dependency graph includes real runtime and excludes dev graph | Hermes size, signed/native runtime, current later edits |

## External gates still open

- **T00/T01:** Team-level Family Controls approval and identifier capabilities evidenced for all five IDs.
  Five App Store profiles were created under release lock, but report profile735XMH25VL has an empty App
  Groups entitlement. The intended group relationship must be assigned and that profile regenerated.
  `asc web` lacks an authenticated session; browser CDP attempts failed. First four profiles passed checks.
- **T04/T06:** Production PostHog erasure personal key/project configuration absent. No live deletion
  acceptance or device identity-spine proof. A schema-ready database alone does not prove erasure ready.
- **T13:** Six subscriptions remain missing review screenshots/metadata readiness. App Store version has
  no build attached and validation blockers remain. Existing review notes are a draft. Privacy label
  publication and truthful release screenshots are unverified. Do not tick checklist lines from this index.
- **T14:** Physical iPhone13 Il is unavailable. Another session owns the booted simulator; it was not
  modified. Current real-runtime simulator/device acceptance and lock-state matrix are incomplete.
- **T15:** Release startup/TTI and battery/device measurements absent. Home semantic-clock optimization
  passed local tests. Unsigned device Release at7619c5bd compiled, but its packaged Hermes bundle was
  7,881,912 bytes: FAIL against the strict decimal4,000,000-byte gate. A disposable single-core Sentry
  dependency experiment measured6,357,304 bytes without experimental optimization and5,947,932 bytes
  with command-only tree shaking. Both still FAIL; neither synthetic export proves native runtime acceptance.
- **T16 (revised scope):** No uploaded candidate or verified TestFlight install yet. Stop at verified
  submission readiness; do not execute App Review submission, public release, or production OTA.
  Device correctness and TestFlight checks are still open, not replaced by server/test evidence.

## Source and ownership

Current integration lives at `/Users/johansardar/ExcerLock-build/ship`; original repository metadata was
moved intact to `ExcerLock-backup-20260910-104501`. The newly initialized original directory is not this
source and must not be overwritten. Build checkout `release-7619c5bd` is clean/detached and claimed.
All release mutations require the whole applicable sequence under `scripts/agent-ops.py run`.
See `plans/ship/PROGRESS.md` for newer checkpoints; do not treat this dated index as live activation proof.

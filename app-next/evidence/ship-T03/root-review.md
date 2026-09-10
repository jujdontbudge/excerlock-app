# Root integration review — 2026-09-10

Initial 0d0e7f6 and revision49edd84 integrated as5dd8bd7/da05987. Independent SDK source review exposed
three remaining defects despite77 green runtime tests: native reload chooses MOST RECENT downloaded
update (not the coordinator's requested ID), safe-to-safe navigation can invalidate the saved resume
envelope, and a final safety denial after guard persistence consumed retry allowance without a reload.
The existing different-staged-ID test encoded the first bug; corrected against installed Expo source.

Root added9 focused tests; initial7 cases all failed before implementation. Pending native supersession
now revokes old authority and waits for a fresh foreground. Resume route/draft snapshots are checked
after every write. Guard reservation/rollback/health acknowledgment share one serialized JS owner;
known pre-reload aborts restore the previous guard, rollback errors deny reload and report, actual
native reload-call failures remain counted. Caller-provided health IDs must match native running ID.

Final OTA suite:82 tests,5 suites passed. Integrated T02+T03 runtime tests had99 passes before these9
additions. Verifier10 mocked-ASC fixtures passed. App typecheck now fails ONLY on pending T01 config/native
import. Lint0 errors (existing warnings remain). Root mounting/explicit hydrated-success milestone/T06
reporting are still T10 integration tasks. No device activation or signed binary claimed.

Root must supply stable safety getters reading current external stores/native operation state, not stale
render-captured booleans. Navigation getter must represent committed navigation+draft state. Expo has no
atomic reload-by-ID API: JS can reject observed supersession, not guarantee against a later native-only
change. Device App Store+TestFlight proof and native launch timing remain release gates.

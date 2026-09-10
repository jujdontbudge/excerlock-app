# T10 watchdog planner checkpoint

Root pure planner only; NOT mounted/native-connected yet.
21 tests pass: conditional-only protection, earned/window/lapse/deletion invalidation, unknown never renews,
5minute renewal cadence,15minute minimum with bounded eligibility/backdating, context generation/version,
foreground force re-registration, clock rewind rejection, explicit cleanup despite stale previous context,
and <=20monitor budget INCLUDING staged replacement. Typecheck/focused lint pass.

Host/native bridge must still arm-before-unshield, preserve old monitor during renewal, serialize state and
native generation guards, handle transport failure without locking ineligible states, and mount above UI.
Hardware minimum/backdating acceptance, force-quit timing and extension callbacks are NOT proven here.
The decision input temporarily supports the existing union plus unlockedPropped until T10 replaces leases.

Pure walking reducer now added:12tests cover3second qualification,5second silence, one stop grace,
unknown/late wake/clock rewind, positive resume versus requalification, duplicate/conflicting timestamps,
immutable/idempotent transitions and corrupted persisted evidence. Grace stores its actual first deadline;
a late wake cannot restart it. Raw motion/cadence fusion, measured history credit, persistence/schema
hydration, native adapters, propped handoff and root mounting remain T11 work; no hardware relief claimed.

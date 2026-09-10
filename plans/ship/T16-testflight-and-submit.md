# T16 — TestFlight, submission, first OTA

Spec: `03-ota-and-release.md` §5; `docs/agents/operations.md` (wrap in `scripts/agent-ops.py run`).

## Steps

1. `eas build --profile production` → `asc xcode`/`asc builds upload`; TestFlight internal group; What to Test.
2. On the TestFlight install: full T14 device pass; `scripts/verify-ota.sh` against a `preview`→`production`
   dry run (publish a no-op update to `production`, assert `expo-v11.db`).
3. Attach the six IAPs to the version; Review Notes; privacy labels; screenshots; submit via `asc`.
4. If rejected for 2.5.1 Family Controls: Resolution Center reply naming all five bundle IDs, resubmit the
   **same build**. Any other rejection: fix, new build, record the verbatim text in `docs/asc/`.
5. Ready for Sale → run the §5 ritual against the public install before any real OTA.

## Acceptance

- [ ] Version in review with IAPs attached; `evidence/release-1.0.0/` has the ritual output for TestFlight.
- [ ] After approval: first production OTA verified on a public install.

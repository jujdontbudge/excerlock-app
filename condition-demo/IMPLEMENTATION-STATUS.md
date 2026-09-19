# Astra production implementation — native verification pending

Branch `fm/condition-demo-prototype-f1` starts from local main `5cb0885e`; only the accepted prototype was carried from the scout (`fbc7fa5a`). Scout history remains on `fm/condition-demo-prototype-f1-scout`. No fast/priority settings were enabled.

Implemented S3b between plan commit and S4, six deterministic scenarios, unchanged Sunburst frames, UI-thread walking/parallax/map/progress, instant manual hold/release, three-second stopped recovery, reduced-motion changes, background cleanup, phase controls, and a fail-closed preview-only seek port. Selected values come from RuleDraft; W1 actually persists place preferences in profileStore, not answers. Saved gym name/radius are read from settings. Existing onboarding analytics now carries scenario/place. No enforcement or condition-engine code was changed.

## Verification completed

- TDD red/green for model, new flow placement, small reviewer target, treadmill pre-unlock flags, testing-port validation, and harness registration.
- Full app suite: **298 suites / 1,726 tests passed**.
- Root `npm run typecheck`: passed.
- App lint: **0 errors**, existing warnings only.
- `npm run test:guardrails`: **18 files / 43 tests passed**.
- Analytics-events package: **30 tests passed**, type checks passed.
- Existing Python E2E harness unit suite passed, including S3b identification and E2E-D1 registration.
- Token snapshot changed only to add the approved illustration palette; prior tokens/contrast assertions were preserved.
- Router tests assert S3 → S3b → S4, both Back transitions, exact persisted rule equality across the demo, and treadmill view analytics.

## Resolved Jest blocker

Expo Router's testing-library imports its own mocks and replaces the root Reanimated module with `react-native-reanimated/mock`. Adding a frame hook only to the root factory is therefore ineffective. Reanimated 4.5.1's `src/mock.ts:117` leaves useFrameCallback unimplemented. The fix consolidates the extension on `/mock` and makes the root mock return that same object. Focused router/screen coverage tests pass without mocking away the demo or weakening navigation coverage.

This is a reusable Expo/RN test pitfall; source evidence is `node_modules/expo-router/build/testing-library/mocks.js:9-12`. The task's outside-write restriction prevents adding it to the global pitfall ledger here; Firstmate can log it separately.

## Remaining delivery gate — not complete, not releasable yet

`E2E-D1` is implemented but has not run on the release simulator. A sibling lane (`/11/excerlock-app`, run `pep-polish-r1`) currently owns/drives the pinned `ExcerLock-Next` simulator. Do not install or interact until it is free. A local `--no-install` build may proceed without disturbing that run.

Required next: release-style preview build; execute D1; inspect all native screenshots against the accepted prototype; inspect the 10-second walking capture for foot sliding/jitter/seams; test compact geometry and Reduce Motion; fix/repeat any failures. Real Screen Time / sensor enforcement cannot run on simulator and is not claimed. No No Mistakes run, push, external release, or main integration has occurred.

Commands/transcripts are local in ignored `condition-demo/verification/`. Final native proof must be retained under `app-next/e2e-next/out/<run>/E2E-D1/` with a fail-closed verdict. Finish and commit the verified implementation before reporting done; Firstmate then requests No Mistakes per the promoted delivery contract.

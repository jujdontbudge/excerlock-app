# TestFlight 1.0.0 (10) — 2026-09-22

Runtime-3 baseline for the captain's two-phase OTA delivery proof. The app tree
includes the accepted Issue #145 UI, the annual-subscription promotional-image
repair record, and `9168c6c5`, which removes the rejected onboarding rating
warm-up and routes S3c directly to T1. This release is TestFlight-only: do not
attach it to the App Store version or submit it for App Review.

## Candidate identity

- App `6787265352`; bundle `com.johansardar.excerlock`; team `AX3C2B78YD`.
- Marketing version `1.0.0`; build `10`; runtime `3`; update channel
  `production`; build environment `production` (`EXCERLOCK_ENV=prod`).
- `asc builds next-build-number` observed processed/upload build `9` and resolved
  `10` as the next safe build number.
- Source, archive, IPA, Apple build ID, processing state and TestFlight group are
  recorded below after the exact committed candidate is exported and processed.

## Bounded verification

The accepted rating-removal commit already records 72 focused Jest tests plus 45
onboarding-harness tests passing. This release reruns only changed-scope config,
guardrail, typecheck and lint checks, then one bounded release-style simulator
flow from S3c through its **Next** action to T1. The flow must show **Try
ExcerLock free**, show no rating warm-up, and retain screenshots of S3c and T1.

## Apple artifact

Pending archive, signed-payload audit, upload and Apple processing.

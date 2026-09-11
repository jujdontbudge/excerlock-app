# ExcerLock

`main` is the authoritative product branch. Open `/Users/johansardar/ExcerLock`
for ongoing work. Completed changes are integrated into `main`; task branches
and the older shipping worktree are historical working copies.

## Application and releases

- **iOS application:** [`app-next/`](app-next). Run Expo/EAS commands from this directory.
- **Backend:** [`server/`](server), deployed using [`deploy/README.md`](deploy/README.md).
- **Website:** [`site/`](site).
- **Legacy application:** `app/` remains for reference and regression tests; it is not a release target.

App Store binaries and Expo OTA updates both originate from verified commits on
`main`. Record the commit, version/build number, native runtime, and artifact or
update ID for each release. The Expo channel named `production` is a distribution
setting, independent of the Git branch name `main`.

Pushing `main` runs CI and service readiness checks. Publishing is a separate
operation governed by [`docs/agents/operations.md`](docs/agents/operations.md).
The current authorization stops at submission readiness: TestFlight upload is
allowed; App Review submission, public release, and production OTA publication
remain excluded.

See [`docs/releases/2026-09-11-main-consolidation.md`](docs/releases/2026-09-11-main-consolidation.md)
for the observed Apple/Expo state and consolidation evidence.

## Local checks

```sh
npm ci
npm run typecheck
npm run test:unit
npm run test --workspace app-next
npm run lint --workspace app-next
npm run test:guardrails
```

The full CI workflow also verifies Expo config loading, installed native patches,
and signed-manifest validation. Product requirements live in
[`plans/ship/README.md`](plans/ship/README.md), with deferred work in
[`plans/post-ship/README.md`](plans/post-ship/README.md).

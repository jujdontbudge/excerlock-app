# Condition demo — local verification only

No shipping authorization. Do not run or resubmit No Mistakes, push, open a pull request, deploy, publish, or release without a new explicit captain instruction.

Verified implementation: `3dad23e41c43d354fcf3aec14be29777809e5f9e`.
Preview Release build: 2026-09-20T02:26:47Z, pinned ExcerLock-Next simulator.

`verdict.json` is the unchanged **E2E-D1 r5 PASS**: 45 assertions. Its live PostHog query requires `properties.screen='plan-demo'`; rows cover all six selected scenario/place combinations. Real onboarding, persisted rule equality, Continue/Back, sustained native hold, release locking, and automatic recovery pass.

The already-running local proof completed after the captain stopped the unauthorized shipping pipeline. No new pipeline was started. The previous pipeline failed at its 30-minute test-agent limit; guarded custody recovery preserved its implementation fixes.

Local screenshots/video remain ignored at `app-next/e2e-next/out/condition-demo-native-r5-plan-demo/E2E-D1/`. Inspected `32-hold-walking.png`: full orange hold button and ring, walking character, and unlocked TikTok splash while the counter still reads 0 s. This verifies immediate fill rather than the removed three-second fill. Binary evidence is not committed.

Current-source checks: 302 app suites / 1,732 tests and 13 snapshots passed; root typecheck and app lint passed. Commands: `npm run test --workspace app-next`, `npm run typecheck`, `npm run lint --workspace app-next`; `python3 app-next/e2e-next/build.py --udid B68873CD-B6ED-4961-85AF-0C807E657999 --no-install --json app-next/e2e-next/build/build.json`; `python3 app-next/e2e-next/run.py E2E-D1 --no-build --run-id condition-demo-native-r5-plan-demo`.

The two freshness JSON files document the earlier cached-query false negative, not this run. The final verifier retains `refresh: force_blocking`; no timeout extension, queue clearing, or assertion weakening.

Limits: simulator presentation/interaction/persistence/live analytics proof, not physical Family Controls or sensor enforcement. This evidence is not a release approval.

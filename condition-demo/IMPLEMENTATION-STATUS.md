# Astra implementation — stopped locally; shipping not authorized

Captain correction (2026-09-20): do not run or resubmit No Mistakes. The already-active local proof finished: E2E-D1 r5 PASS, 45 assertions, live `plan-demo` coverage on exact source `3dad23e41c43d354fcf3aec14be29777809e5f9e`; instant full hold fill inspected at 0 seconds. Current source: 302 suites/1,732 tests, typecheck and lint pass. Compact final evidence: `app-next/evidence/condition-demo/README.md` and `verdict.json`. No push, merge, publication or release. The prior pipeline failed at its 30-minute test-agent limit; guarded recovery preserved its changes. Everything below is earlier implementation history, not authorization to resume a pipeline.

Branch `fm/condition-demo-prototype-f1` starts from local main `5cb0885e`; only accepted prototype assets were carried from the scout. Production source verified at `0c48eb61347a8852f3384b0fd023844cd5d02275`. Nothing pushed or released; no fast/priority service mode enabled.

## Implemented

S3b follows the existing S3 plan commit and precedes S4. All six approved scenarios use actual RuleDraft goals, profileStore walk places, saved gym name/radius, and unchanged Sunburst frames. Continue/Back do not recommit the rule. UI-thread clocks drive full-canvas crossfaded walking, parallax, map, progress, and deterministic hold/release. Shipped shield copy, reduced motion, lifecycle cleanup, accessible actions, responsive geometry, and preview-only phase seeking are included. No enforcement/sensor rules changed.

## Verification

- Full app suite: **301 suites / 1,731 tests passed**, 13 snapshots.
- Root `npm run typecheck`: passed. App lint: zero errors (existing warnings only).
- Guardrails: **18 files / 43 tests passed**. Python harness: **42 tests passed**.
- **E2E-D1 PASS**, `condition-demo-native-r4`, 45 assertions, all six scenario/place combinations ingested by live PostHog. Preview Release binary built 2026-09-20T00:59:40Z from `0c48eb61`.
- Screenshots cover all flow screens and demo states; selected phases include TikTok splash/loading/feed, every shield, treadmill prop/scan, goal completion, map arrival/dwell/leave, and real sustained native touch/release/recovery.
- Inspected walking recording and sampled frames: sprite remains on its fixed canvas, the complete character/feet are visible, walking and scenery stop/resume together, splash/shield transitions loop correctly. The 9-fps poses crossfade on the UI thread; the video is not a device performance benchmark.
- Large Dynamic Type exposed clipped hold text. Added a red/green regression, flexible hold height, fixed-size diagram labels plus an uncapped large-text explanation; native live-resize screenshots now show readable content and reachable Continue. Reduce Motion native capture shows discrete frames without crossfade/bob; settings restored afterward.
- Compact geometry is covered by layout tests (327×300 stage); native captures use the one pinned 402×874 simulator. No physical 375×667 device claim. Family Controls and actual sensor enforcement cannot be proved on simulator.

Durable proof: `app-next/evidence/condition-demo/` (verdict and query freshness JSON plus README, the only evidence types `app-next/.gitignore` admits). Screenshots, the 10-second walking video, motion contact sheets and logs stay in ignored `app-next/e2e-next/out/condition-demo-native-r4/E2E-D1/` and `condition-demo/verification/`.

## Diagnoses fixed, without weakening tests

1. Expo Router imports `react-native-reanimated/mock` directly. Consolidated its useFrameCallback extension on that exact mock object; kept real S3→S3b→S4 router coverage.
2. SVG Fabric animation needs native matrix props. Installed react-native-svg `G<P>` supports the matrix extension; typed both animated groups explicitly rather than casting away the failure. Root typecheck red/green recorded.
3. RN Image prepends intrinsic asset dimensions. Absolute fill alone left 435×648 sprites oversized. Explicit 100% image dimensions constrain every decoded frame to the approved parent canvas; regression red/green and native screenshots prove the fix.
4. PostHog Query API defaults can cache an initial partial result throughout polling. r2 server `created_at` showed final events arrived before the verdict, while API metadata said `is_cached: true`. Added `refresh: force_blocking` to the real query request with a failing-then-passing regression. Two live forced queries returned `is_cached: false`; final D1 passed without extending timeout, restarting the app to satisfy assertions, clearing queues, or changing production SDK behavior. r1 also had native QUIC/network timeout evidence, but that does not establish a durable SDK defect. No speculative production transport workaround was introduced.

r1/r2 FAIL verdicts remain untouched. r3 passed but reused an outdated metadata file despite building the corrected artifact; r4 supersedes it with the exact build manifest emitted by build.py. Always pass `--json app-next/e2e-next/build/build.json` on standalone builds (or persist its returned manifest) before `run.py --no-build`.

## Handoff

Implementation and evidence are retained locally. The earlier Firstmate shipping escalation was unauthorized and has been withdrawn. Stop; do not resume No Mistakes or delivery without a new explicit captain instruction. No remote push, merge, TestFlight, OTA, or API release has occurred. The captain-approved prototype and granular prompt remain in `condition-demo/`.

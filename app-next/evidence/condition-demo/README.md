# Condition demo native proof

Final source: `0c48eb61347a8852f3384b0fd023844cd5d02275`. Preview Release build, one pinned ExcerLock-Next simulator. `verdict.json` is the unchanged E2E-D1 r4 result: PASS, 45 assertions, live PostHog coverage for every selected scenario/place, persisted-rule equality, navigation, actual hold/release and automatic recovery.

`screenshots/` contains 480-pixel-wide copies of every r4 screenshot plus normal/large-text/reduced-motion captures. Original names match the verdict artifact names (absolute original paths in the verdict describe the producing worktree). Originals: `app-next/e2e-next/out/condition-demo-native-r4/E2E-D1/`.

`walking-loop.mp4` is the 10-second native recording scaled to 402×874, H.264 CRF25; `final-loop.jpg` samples it at 2 fps. `reduced-cycle.jpg` samples the separate Reduce Motion recording at 9 fps. Frames show complete sprite canvases, crossfaded gait in normal mode, discrete poses without bob in reduced mode, stopped scenery/standing during the shield, and restart into TikTok. This is visual evidence, not an FPS/performance guarantee.

`r2-ingestion-times.json` records server creation times for the earlier false-negative query. `live-query-freshness.json` records two uncached queries after the harness fix. No tokens or credentials included. The harness regression asserts `refresh: force_blocking`, keeping the live-ingestion oracle rather than extending waits or weakening coverage.

Commands: root `npm run typecheck`; `npm run lint --workspace app-next`; `npm run test --workspace app-next` (301 suites/1,731 tests); `npm run test:guardrails` (18 files/43 tests; prebuild and tests completed separately after a concurrent-prebuild transient); `python3 -m unittest discover -s app-next/e2e-next -p test_harness.py` (42 tests); `build.py --udid B68873CD-B6ED-4961-85AF-0C807E657999 --no-install`; persist the returned build manifest; `run.py E2E-D1 --no-build --run-id condition-demo-native-r4`.

Limits: native viewport 402×874; compact 327×300 stage is unit-tested, not a second simulator. No physical Screen Time/Family Controls or real sensor-enforcement claim. Nothing shipped remotely.

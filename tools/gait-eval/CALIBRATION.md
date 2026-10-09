> Historical notes imported from branch 07331d0a. The cited artifacts are not evidence for this checkout. Current evaluation and limitations: [SESSION-ONE.md](SESSION-ONE.md).

# Frozen Stage 1 calibration

Run from this checkout:

```sh
node --import tsx tools/gait-eval/calibrate.ts /Users/johansardar/ExcerLock/.excer/treadmill-incident
EXCER_SIM=ExcerLock-treadmill EXCER_METRO_PORT=8092 ./excer gait eval /Users/johansardar/ExcerLock/.excer/treadmill-incident
```

Settings are frozen in `frozen-settings.json`, version `windowed-1`. Pearson r ≥ 0.5 and r₂ ≥ 0.25 were retained. A fixed scale, smoothed and detrended signal, and discarded filter edges yield a different statistic from the prototype; its old correlations are not reused.

The local calibration artifact is `.excer/gait-eval/calibration/report.json`. Recordings remain in the read-only lead evidence folder and are not committed here. The replay report is `.excer/gait-eval/v1/2026-10-04T01-25-20-493Z/report.json`.

| Recovered walking fixture | New pass | Old pass | r / r₂ at new pass | Source |
|---|---:|---:|---|---|
| Console head | 8.133 s | 3.467 s | 0.942 / 0.912 | face |
| Single walker | 8.141 s | 2.269 s | 0.854 / 0.901 | shoulders |
| Group walker | 8.033 s | no pass | 0.898 / 0.849 | shoulders |

The two body-only historical fixtures use a fixed half-torso scale. They do not validate head-and-shoulders framing or native association.

Each simulation is 400 independent generated 30-second attempts, seed 7, 15 frames/s, timestamp jitter, slow sway, face-size jitter and the listed random frame loss. The old detector is restarted every five seconds like the incident simulation. Both read identical samples.

| Simulation | Drops | New passes / 400 | Old passes / 400 |
|---|---:|---:|---:|
| Still, 0.48 px jitter | 0% | 0 | 0 |
| Still, 0.96 px jitter | 0% | 0 | 59 |
| Still, 1.44 px jitter | 5% | 0 | 400 |
| Still, 1.92 px jitter | 10% | 0 | 400 |
| Still, 2.88 px jitter | 15% | 0 | 400 |
| Still, 4.8 px jitter | 15% | 0 | 400 |
| Irregular talking | 5% | 0 | 400 |
| Slow weight shift | 5% | 0 | 400 |
| Deliberate 2 Hz bob | 5% | 400 | 400 |

Median deliberate-bob pass: new 8.2 s, old 2.2 s. This is the known residual. These are synthetic checks and three calibration positives; they do not establish the owner/setup go/no-go. All 60 owner clips and physical iPhone checks remain pending. Build 17's watchdog deadline callback defect (#164) blocks a JS-only suspended-expiry claim; Stage 2 corrects it in the next binary.

## Optional build 18 fields

The same frozen settings were replayed with synthetic capture timestamps, sequences, background flow and lower-body joints. Stable background and paired alternating knees each pass at 8.133 s. Periodic background shake rejects as `cameraMotion`; unreliable background rejects as `cameraCoverage`; non-alternating visible knees reject as `kneeAlternation`; 201 ms delivery delay rejects as `timestamp`; an explicit empty frame every two seconds rejects as `coverage`. These demonstrate JS corroboration gates and fail-closed delivery, not native measurement accuracy or physical sensitivity.

The shared build 18 analyzer/extractor compiled on macOS and rejected a blank local MP4. Its report is `.excer/gait-eval/v1/2026-10-04T02-05-06-950Z/report.json`. Timings identify macOS serial Vision work and are not an iPhone benchmark. Camera-motion thresholds and geometric association remain unverified on owner clips and a live iPhone 13.

## Simulator evidence

Focused proofs, individually bounded to five minutes:

- Still ring empty: `.excer/proof/walking/2026-10-04_02-09-05/`.
- Walking pass: `.excer/proof/walking/2026-10-04_02-34-15/`.
- Warning at 14½ minutes and JS re-lock at 15: `.excer/proof/walking/2026-10-04_02-27-10/`.
- Background/resume reacquires evidence: `.excer/proof/walking/2026-10-04_01-39-35/`.
- Cancel, remain inactive, then fresh scan: `.excer/proof/walking/2026-10-04_02-12-09/`.

The still proof failed with the old detector, showing `Screen Time unlocked!`, in `.excer/proof/walking/2026-10-04_02-07-41/`. Bundle inspection confirmed the old constructor was served, then confirmed the restored windowed constructor (`.excer/gait-eval/old-behavior-proof.txt` and `fixed-behavior-proof.txt`). Native capture, real notifications/shields and suspended expiry remain device checks. The cancellation proof uses the fake walking adapter; the queued native-adapter pass/cancel race was additionally corrected by generation checks, but that exact asynchronous interleaving has not been demonstrated on-device.

The strengthened warning proof checks that the scheduled instant is exactly 30 seconds before the active lease deadline, then observes delivery and expiry re-lock. Native iOS simulator compilation passed with warnings: `r:49954:1791080721`, result bundle `/Users/johansardar/.bb/plugins/xcode/bundles/run-mut77t81-88293-4.xcresult`. The built Info/Expo plists confirm build 18, runtime 5 and the camera usage description. `.excer/build18/build-verdict.txt` records it. Earlier full builds timed out while populating this worktree's retained cache; the final verdict is from Xcode's result artifact.

Build 18 was installed only on `ExcerLock-treadmill` in the hidden worker set (UDID `884C1345-CA88-4B9B-B932-9834D8029D96`). The walking proof above passed on that rebuilt binary with Metro 8092; its fake payload has no optional native fields, so it also exercises the Stage 1 fallback. This is an app startup and fake-scan proof, not live Vision or DeviceActivity enforcement. Nothing was pushed, merged, published or uploaded. The branch remains local.

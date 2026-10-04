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

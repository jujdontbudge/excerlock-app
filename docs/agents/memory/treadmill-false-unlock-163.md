---
name: treadmill-false-unlock-163
description: "The 2026-10-03 treadmill camera unlock that passed while Johan stood still; diagnosis, Astra review and the staged fix in issue #163, awaiting his go-ahead"
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-04T00:17:00.476Z
---

On 2026-10-03 Johan stood still in front of the propped phone and the treadmill unlock still passed.

Causes, per issue #163:
- With hips out of view, `GaitPeriodicityDetector` reads face-box jitter as head bob. Simulated, a still person unlocks 100% of the time at about 1.4 px of jitter.
- The scan restarts about 7 times in 35 s, giving that many chances to pass.
- `proppedMachine` has no 15-minute lease, so one pass never expires.

Evidence is saved in `.excer/treadmill-incident/`:
- the simulation scripts;
- a prototype windowed detector;
- the real head-only walking recording recovered from git history (commit c484d28a^, `app-next/src/engine/signals/gait/fixtures/`);
- Astra's two replies.

"Astra" means the `gpt-6-astra` model, reached with `command codex exec -m gpt-6-astra -s read-only`.

**Why:** Johan wants detection to pass only real treadmill walking at head-and-shoulders framing. He asked for a rigorous fix and a real test.

**Built (2026-10-03):** Worker `thr_7r27jfcre4` finished on branch `bb/treadmill-check-only-real-walking-passes-163-thr_7r27jfcre4`.
- Stage 1 (JS) is commits 044e9f9d–07331d0a; stage 2 (native, build 18 / runtime 5) is 33e5dc91–4f5a8a1d.
- The real walks pass at about 8.1 s. Standing, talking and shifting pass 0/400 times; deliberate bobbing passes 400/400.
- The recording guide for Johan is tools/gait-fixture-extractor/RECORDING.md on that branch; calibration is in tools/gait-eval/CALIBRATION.md.
- #164 (build 17's native watchdog defect) means OTA alone can't certify the suspended expiry.
- Its simulator and Metro are deleted. Not merged; its ADR 0062 must be renumbered to 0063.

**How to apply:**
- Stage 1 (JS detector, one continuous scan, a real 15-minute lease enforced by the DeviceActivity watchdog) can go out as an OTA. It is gated on a 60-clip recording session replayed through `./excer gait eval`, which doesn't exist yet.
- Stage 2 is native and waits for build 18.
- Head-and-shoulders video cannot reject deliberate rhythmic bobbing; that residual is stated in the product promise.
- Merging or shipping needs Johan's go-ahead and his 60 clips through `./excer gait eval`. Related: [[old-app-has-built-detection]], [[lifecycle-spec-162]].

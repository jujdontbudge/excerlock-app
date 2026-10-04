# Local gait extraction

See [RECORDING.md](RECORDING.md) for the owner's 60 clips and evaluation commands.

`swift tools/gait-fixture-extractor/extract.swift <video> <out.json> [targetFps]` runs macOS Vision face rectangles and body pose, selects the largest face and largest central body like build 17, and emits screen-space coordinates (y downward). It interprets the video track's preferred orientation transform, including mirrored transforms. The default budget is 15 fps. Missing body and face detections emit nothing, matching build 17. Zero-confidence recognized joints stay in the payload, also matching production.

The JSON document contains samples and extraction settings. Times start at the first video frame and model build 17's serial analysis completion: capture time plus measured Vision work. Frames that arrive before the preceding work finishes are dropped. No synthetic empty detections, interpolated observations or repaired timestamps are emitted. Production analysis timing on an iPhone is different from this macOS measurement; the extraction settings identify that limitation. The evaluator runs the real controller on those times.

Keep Camera originals and reports local. `.MOV` and `.mp4` work with AVFoundation. Other formats must be transcoded locally first. A video with no reliable face/body signal is a rejection, not a clip to remove from the success denominator. Do not substitute overlapping crops for independent attempts.

## Build 18

`./excer gait eval <folder> --payload build18` compiles the shipping `GaitFrameAnalyzer`, `GaitCameraMotion` and payload selection with `build18/main.swift`. It applies the track orientation, scales to a 640-pixel maximum dimension, emits capture PTS, sequences, explicit empty/busy frames, associated joints and background motion. The report includes per-stage mean/p95/max processing and delivery delay. It models a bounded serial 15 fps stream using measured macOS work; an iPhone 13 must still be profiled live.

The default `--payload build17` retains the OTA-compatible extraction path. Run both payloads on the same originals to judge the next binary separately. JSON with optional build 18 fields can also be replayed directly. Reports record detector, extractor, settings and input hashes.

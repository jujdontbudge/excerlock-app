# gait-fixture-extractor

Offline pose extraction for the treadmill-mode gait fixtures (#118).

Runs **the same Vision request the on-device module runs** over a video file and emits
`GaitKeypointSample` JSON that `FixtureGaitVisionProvider` can replay. Because it reuses the
production request, selection rule, and coordinate convention, the fixtures reproduce on-device
behaviour instead of approximating it:

- `VNDetectHumanBodyPoseRequest`
- largest-central-body selection, ported from `largestCentralBody()` in `GaitVisionPayloads.swift`
- the four torso landmarks (`leftShoulder`, `rightShoulder`, `leftHip`, `rightHip`)
- `y` flipped to screen space (`1 - y`), matching `gaitVisionPayload()`
- default sampling at 15 fps, matching the device capture budget

macOS only — it needs the system Vision framework.

## Usage

```sh
swift extract.swift <video> <out.json> [targetFps]
```

Prints a one-line JSON summary: frames read, frames analysed, samples emitted, and
`framesWithConfidentTorso` (all four landmarks at confidence ≥ 0.6, the detector's threshold).
That last number is the quality signal — a clip with few confident-torso frames is not usable
as a fixture.

Timestamps are rebased to zero so fixtures do not depend on where a clip was trimmed.

## Input formats

AVFoundation cannot open WebM or OGV, which is what most Creative Commons libraries serve.
Transcode first:

```sh
ffmpeg -i in.webm -an -c:v h264_videotoolbox -b:v 3M -pix_fmt yuv420p -vf scale=-2:480 out.mp4
```

`libx264` is often unavailable in bundled ffmpeg builds; `h264_videotoolbox` ships with macOS.

## Sourcing footage

See #118 for the licensing rules. Short version: commercial-permitting licences only, and the
standard academic gait datasets are excluded because they are academic-use only.

**Screen the footage before trusting it.** Verified during the first sourcing pass: the only
keyless-library clip that produced a long clean run was an astronaut on the ISS treadmill —
harnessed, in microgravity. It would have looked like a perfectly good fixture in the numbers
while encoding gait that does not exist on Earth. Extract a frame and look at it.

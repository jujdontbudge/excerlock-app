# Excerlock Gait Vision

Local iOS Expo Module for the foreground propped-phone treadmill check.

- Captures only the front camera at 640×480 and 15 fps.
- Runs `VNDetectHumanBodyPoseRequest` on every other frame.
- Chooses the largest detected body, using centrality as the deterministic
  tie-breaker, and emits only shoulder/hip coordinates and confidence.
- Keeps frames in memory for product gait scans: no recording, persistence,
  transmission, face recognition, or frame retry.
- Requests camera permission only when `start()` is first called and tears the
  capture session down when `stop()` is called.
- Exposes a native preview view backed by the same capture session; it never
  opens a second camera session or retains a frame.

`NativeGaitVisionProvider` is the stable SignalKit adapter. The scan owner stops
the provider as soon as `GaitPeriodicityDetector` completes; the native session
does not make gait decisions.

The wrapper requires physical-device verification for camera framing, Vision
throughput, and front-camera orientation. Ticket #113 is intentionally marked
device-unverified until that verification happens.

Harness builds can explicitly call `beginHarnessCapture` before `start`. That
opt-in path writes the same 640×480, 15 fps sample-buffer stream to a sandboxed
H.264 movie, excluded from device backups. `endHarnessCapture` closes it and
`deleteHarnessCaptures` removes all harness movies. Normal product calls to
`start` never enable the writer and preserve the no-frame-retention contract.

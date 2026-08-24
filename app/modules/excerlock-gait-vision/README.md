# Excerlock Gait Vision

Local iOS Expo Module for the foreground propped-phone treadmill check.

- Captures only the front camera at 640×480 and 15 fps.
- Runs `VNDetectHumanBodyPoseRequest` on every other frame.
- Chooses the largest detected body, using centrality as the deterministic
  tie-breaker, and emits only shoulder/hip coordinates and confidence.
- Keeps frames in memory: no recording, persistence, transmission, face
  recognition, or frame retry.
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

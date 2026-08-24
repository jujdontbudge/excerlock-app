# Treadmill scan

The Home walking card starts a propped `WalkingSessionController` session, then
navigates here. `TreadmillScanController` owns the foreground Vision scan and
its five-second attempt / 30-second framing grace; `TreadmillScanCoordinator`
owns only session transitions and navigation.

The iOS native preview and pose samples share one `AVCaptureSession`. Frames are
processed on-device and are never recorded, retained, or sent. Camera permission
is requested only when this route starts its first native scan.

If permission is denied, the coordinator stops the propped session and starts
the ordinary handheld verifier before the user dismisses the explanation. A
failed framing grace stops the unverified session. A successful scan advances
the existing session state machine and dismisses the route.

Native preview framing, Vision throughput, and front-camera orientation remain
device-unverified until ticket #113 receives physical-device validation.

# Excerlock Gait Vision

Local iOS Expo module for the foreground Treadmill scan. Build 18 (runtime 5) captures the front camera at 640×480 and 15 fps. A serial delegate runs reusable Vision pose and face requests; `alwaysDiscardsLateVideoFrames` bounds queued work. Optical flow retains only the preceding frame. Product scans never record, persist or transmit frames or trajectories.

Each sample carries capture PTS anchored to epoch milliseconds, a sequence number, analysis completion time, and pose/face/motion/total durations. Missing detections and dropped buffers emit explicit empty frames. The JS detector rejects stale frames, incomplete coverage and gaps over 200 ms; overload makes a pass harder. Start/stop generations reject stale permission, configuration and analysis completion.

The largest face is associated geometrically with a confident body nose and neck. Ambiguous association excludes the body. Shoulder, hip, nose, ear, neck, knee and ankle coordinates use normalized screen space, y downward. Low-accuracy Vision optical flow estimates robust background translation outside the person. Weak texture, insufficient background or inconsistent flow has zero quality and cannot establish camera stability. These are geometric checks, without identity recognition.

The windowed JS detector requires the walking rhythm first. When supplied, camera motion may reject console shake and paired knees must corroborate alternation when visible. Neither independently grants access. Every new field is optional; the same JS accepts build 17's four joints, face and analysis-time timestamp without a new native API.

The native preview shares this capture session. Permission is requested only on a user-started scan. Harness builds may explicitly opt into sandboxed, backup-excluded footage using the existing capture APIs; product scans never activate the writer.

The offline build 18 extractor compiles these exact analyzer and payload files. Its macOS durations are not an iPhone benchmark. iPhone 13 release checks remain: orientation, association with a background walker, console shake, side rails, visible knees, sustained 15 samples/s, no lag, and suspended/terminated Screen Time expiry. Poor framing or processing throughput must reject, not weaken cadence or coverage thresholds.

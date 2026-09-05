# Gait vision

Public seam for foreground gait observations. `GaitVisionProvider` is a dumb
stream of shoulder and hip landmarks plus the face box (`head`); gait decisions
stay in the detector. A phone propped on a treadmill console sees head and
shoulders only, and Vision's body-pose model then finds a body in ~15 % of
frames while face detection finds the head in ~99 %, so the detector reads
walking from head bob (centre y over face height) whenever the trunk is not in
view. `FixtureGaitVisionProvider` replays deterministic synthetic streams so
decision logic does not require a camera or physical device.

# Gait vision

Public seam for foreground, body-pose gait observations. `GaitVisionProvider`
is a dumb stream of shoulder and hip landmarks; gait decisions stay in the
detector. `FixtureGaitVisionProvider` replays deterministic synthetic streams so
decision logic does not require a camera or physical device.

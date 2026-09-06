# Development scripts

Own reproducible local checks and headless simulator workflows. They do not change the reference app or use real product services.

`sh scripts/check.sh` runs the task acceptance checks. Expo MCP supplies and verifies the Expo recipes used here.

`capture-previews.py` captures both variants of each design-system component at normal and accessibility-large content sizes. `sim.py` supplies accessibility-driven taps, gestures and recording. Capture paths are absolute, and generated evidence is excluded from Metro's file map. Keep the simulator headless; no Maestro.

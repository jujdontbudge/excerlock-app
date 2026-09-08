# Development scripts

Own reproducible local checks and headless simulator workflows. They do not change the reference app or use real product services.

`sh scripts/check.sh` runs the task acceptance checks. Expo MCP supplies and verifies the Expo recipes used here.

`capture-previews.py` captures both variants of each design-system component at normal and accessibility-large content sizes. `sim.py` supplies accessibility-driven taps, gestures and recording. Capture paths are absolute, and generated evidence is excluded from Metro's file map. Keep the simulator headless; no Maestro.

`capture-final-flows.py <flow>` produces T15 recordings; set `EXCER_FINAL_EVIDENCE=evidence/T16` for a final-source acceptance replay. `visible_tap.py` scrolls an AX target above fixed tabs before tapping; never use a hidden row's coordinates. idb reports custom adjustables as Button plus increment/decrement actions, not necessarily Slider.

T16: `accept-cold-launch.py` handles observed dev-client host chrome; `accept-branches.py [branch]` drives complete onboarding and verifies W3 kill/resume on walking-goal; `accept-permissions.py` exercises local grant/deny choices; `accept-edges.py` covers paywall, units, five gyms and delete-to-empty; `capture-acceptance-data.py` compares live Home and recap facts. Scripts target only the owned ExcerLock-Next simulator.

`accept-preferences.py` verifies actual native Switch value changes and auto-detect grant/deny/disable outcomes after scroll settling.

`accept-picker-stability.py` measures the native picker heading before and after a query, verifying that filtering preserves control positions.

`verify-device-run.js` checks a pulled diagnostics log from Johan's iPhone against the physical-device
acceptance scenarios (`docs/verification/device-runbook.md`); `device-run-scenarios.js` holds one check per
row and `device-run-log.js` the parser. `node scripts/verify-device-run.js --list` prints the scenario ids;
`node --test scripts/*.test.cjs` runs its tests.

# T13 — sessions and shields

Implemented the scripted walking lifecycle, lease and grace countdowns, verified step/minute facts, minimize/reopen, Stop and ending summary. Done clears the ended session so another walk can begin. Loaded and cold-restored walking sessions resume their fake script. Walking minutes contribute to the ten-minute streak floor without latching a walking-state unlock.

Gym check-in rejects outside presence, reports the 400 m hint, and satisfies arrival conditions inside. Time-based gym conditions preserve accumulated minutes and continue counting after check-in; leaving pauses accumulation. Authorized auto-detection uses the same local presence clock. Treadmill framing responds to the developer propped/handheld state. No sensor, camera, location or server is contacted.

The developer shield preview exposes all three causes, on a white canvas. The pure domain content model chooses the next unlock action and secondary button. It is a content/layout preview; Phase 2 supplies the native shield renderer and system blur.

## Evidence

- `walking-phases.mp4`: verifying, walking, minimized Home, reopening, grace, ended/relocked, restart and Stop.
- `gym-checkin.mp4`: outside disabled, inside enabled, successful arrival, unlocked Home.
- `shield-causes.mp4`: locked, lock window, walking ended.
- `treadmill-framing.mp4`: handheld/propped readiness, starting and drag dismissal.
- Matching PNG/AX JSON captures and logs are local evidence.
- `session-red.log` → `session-green.log`: frozen loaded walking script and non-advancing gym minutes reproduced before fixes.
- `resume-red.log` → `resume-green.log`: cold walking resume reproduced before fix.
- Sheet interaction tests exercise phases, Stop/Done, presence gating and treadmill readiness.

Reference review: OtterLife OT01-M029's receding review sheet, stable branch-control strips, and the treadmill/Swift shield facts informed this implementation. Own native recordings were inspected. Gemini grading remains deferred by the user's instruction; no Gemini pass is asserted. T14 will tighten sheet focus isolation and large-text behavior; T15 will review the complete motion set.

Final checks: 309 tests / 109 suites / 14 snapshots passed; TypeScript and ESLint passed. Native session and treadmill capture scripts both completed successfully. Earlier capture retries were harness label/transition timing issues, corrected by selecting button roles rather than same-named headings and waiting for layout to settle.
